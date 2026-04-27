import type { TopicType } from '../llm/llm.schemas.js';
import { llmService } from '../llm/llm.service.js';
import { AppError } from '../shared/middleware/error-handler.js';
import { TopicRepository } from '../topic/topic.repository.js';
import { TopicService } from '../topic/topic.service.js';
import { stripMarkers } from '../topic/topic.utils.js';
import { QuizRepository } from './quiz.repository.js';
import {
    FlatQuizQuestionsSchema,
    type GenerateQuizRequest,
    type QuizQuestion,
    type SubmitQuizAttemptRequest,
} from './quiz.schemas.js';

interface StreamCallbacks {
  onChunk: (text: string) => void;
  onMeta: (meta: { quizId: string; cached: boolean }) => void;
  onComplete: () => void;
}

interface QuizResult {
  id: string;
  topicId: string;
  topicName: string;
  questions: QuizQuestion[];
  score: number;
  passed: boolean;
  attemptNumber: number;
  attemptedAt: string;
  completedAt: string;
  topicStatusUpdated: boolean;
}

export class QuizService {
  private quizRepository: QuizRepository;
  private topicRepository: TopicRepository;
  private topicService: TopicService;

  constructor() {
    this.quizRepository = new QuizRepository();
    this.topicRepository = new TopicRepository();
    this.topicService = new TopicService();
  }

  async generateQuiz(
    userId: string,
    request: GenerateQuizRequest,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const [topic, userTopic] = await Promise.all([
      this.topicRepository.findById(request.topicId),
      this.topicRepository.findUserTopic(userId, request.topicId),
    ]);

    if (!topic || !userTopic) {
      throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND');
    }

    const existingQuiz = await this.quizRepository.findUnattemptedQuizForTopic(userId, request.topicId);
    if (existingQuiz) {
      await this.streamCachedQuiz(existingQuiz.id, existingQuiz.questions as QuizQuestion[], callbacks, signal);
      return;
    }

    let accumulatedText = '';

    await llmService.generateQuizStream(
      {
        topic: {
          name: topic.name,
          topicType: topic.topicType as TopicType,
          category: topic.category,
          subcategory: topic.subcategory,
          content: {
            what: stripMarkers(topic.contentWhat),
            why: stripMarkers(topic.contentWhy),
            pros: (topic.contentPros as string[]).map(stripMarkers) ?? [],
            cons: (topic.contentCons as string[]).map(stripMarkers) ?? [],
            compareToSimilar: ((topic.contentCompareToSimilar as { topic: string; comparison: string }[]) ?? []).map(
              (c) => ({ topic: c.topic, comparison: stripMarkers(c.comparison) })
            ),
          },
        },
      },
      {
        onChunk: (text) => {
          accumulatedText += text;
          callbacks.onChunk(text);
        },
        onComplete: () => {
          // Quiz persistence happens after stream completion.
        },
      },
      signal
    );

    const parsed = this.extractJson(accumulatedText);
    const validated = FlatQuizQuestionsSchema.parse(parsed);

    const questions: QuizQuestion[] = validated.questions.map((question) => ({
      question: question.question,
      options: [question.option_0, question.option_1, question.option_2, question.option_3],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    }));

    const quiz = await this.quizRepository.create({ questions });
    await this.quizRepository.createQuizTopics(quiz.id, [request.topicId]);

    callbacks.onMeta({ quizId: quiz.id, cached: false });
    callbacks.onComplete();
  }

  async submitQuizAttempt(
    userId: string,
    quizId: string,
    answers: SubmitQuizAttemptRequest
  ): Promise<QuizResult> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new AppError('Quiz not found', 404, 'QUIZ_NOT_FOUND');
    }

    const topicId = await this.quizRepository.getTopicIdByQuizId(quizId);
    if (!topicId) {
      throw new AppError('Quiz topic relation missing', 500, 'QUIZ_TOPIC_MISSING');
    }

    const topic = await this.topicRepository.findById(topicId);
    if (!topic) {
      throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND');
    }

    const questions = quiz.questions as QuizQuestion[];
    if (answers.userAnswers.length !== questions.length) {
      throw new AppError('Invalid answer count', 400, 'INVALID_ANSWER_COUNT');
    }

    const correctAnswers = questions.reduce((count, question, index) => {
      return count + (question.correctAnswer === answers.userAnswers[index] ? 1 : 0);
    }, 0);

    const score = Math.round((correctAnswers / questions.length) * 100);
    const passed = score >= 80;

    const now = new Date();
    await this.quizRepository.createUserQuiz({
      userId,
      quizId,
      score,
      passed,
      attemptedAt: now,
      completedAt: now,
    });

    let topicStatusUpdated = false;
    if (passed) {
      await this.topicService.markTopicLearned(userId, topicId);
      topicStatusUpdated = true;
    }

    const attemptNumber = await this.quizRepository.countUserAttemptsForTopic(userId, topicId);

    return {
      id: quiz.id,
      topicId,
      topicName: topic.name,
      questions,
      score,
      passed,
      attemptNumber,
      attemptedAt: now.toISOString(),
      completedAt: now.toISOString(),
      topicStatusUpdated,
    };
  }

  private extractJson(text: string) {
    const cleaned = text.trim();

    const jsonBlockMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      return JSON.parse(jsonBlockMatch[1].trim());
    }

    const codeBlockMatch = cleaned.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim());
    }

    return JSON.parse(cleaned);
  }

  private async streamCachedQuiz(
    quizId: string,
    questions: QuizQuestion[],
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const flat = {
      questions: questions.map((question) => ({
        question: question.question,
        option_0: question.options[0] ?? '',
        option_1: question.options[1] ?? '',
        option_2: question.options[2] ?? '',
        option_3: question.options[3] ?? '',
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      })),
    };

    const payload = JSON.stringify(flat);

    for (let index = 0; index < payload.length; index += 32) {
      if (signal?.aborted) {
        throw new AppError('Quiz stream aborted', 499, 'QUIZ_STREAM_ABORTED');
      }

      callbacks.onChunk(payload.slice(index, index + 32));
      await new Promise((resolve) => setTimeout(resolve, 12));
    }

    callbacks.onMeta({ quizId, cached: true });
    callbacks.onComplete();
  }
}
