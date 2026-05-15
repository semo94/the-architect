import { FastifyReply, FastifyRequest } from 'fastify';
import { runSseLlmStream } from '../shared/utils/sse-stream.js';
import {
  GenerateQuizRequestSchema,
  QuizIdParamSchema,
  SubmitQuizAttemptRequestSchema,
} from './quiz.schemas.js';
import { QuizService } from './quiz.service.js';

export class QuizController {
  private quizService: QuizService;

  constructor() {
    this.quizService = new QuizService();
  }

  async generateQuiz(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = GenerateQuizRequestSchema.parse(request.body);
    const userId = request.user.sub;

    await runSseLlmStream({
      request,
      reply,
      sseBindings: {
        stream: 'generate_quiz',
        userId,
        topicId: body.topicId,
      },
      includeLearningResources: false,
      streamErrorLogMessage: 'generateQuiz stream error',
      userFallbackErrorMessage: 'Quiz stream failed',
      run: (callbacks, signal) =>
        this.quizService.generateQuiz(userId, body, callbacks, signal),
    });
  }

  async submitQuizAttempt(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;
    const { id } = QuizIdParamSchema.parse(request.params);
    const body = SubmitQuizAttemptRequestSchema.parse(request.body);

    const result = await this.quizService.submitQuizAttempt(userId, id, body);
    reply.status(201).send(result);
  }
}
