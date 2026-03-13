import { QuizQuestion, QuizResult, UserQuizWithDetails } from '@/types';
import { z } from 'zod';
import { authService } from './authService';
import sseClient, { SSEError } from './sseService';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const QuizQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      option_0: z.string(),
      option_1: z.string(),
      option_2: z.string(),
      option_3: z.string(),
      correctAnswer: z.number().min(0).max(3),
      explanation: z.string(),
    })
  ).length(4),
});

class QuizService {
  private extractJSON(text: string): any {
    let cleanedText = text.trim();

    const jsonBlockMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      cleanedText = jsonBlockMatch[1].trim();
    } else {
      const codeBlockMatch = cleanedText.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        cleanedText = codeBlockMatch[1].trim();
      }
    }

    return JSON.parse(cleanedText);
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await authService.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async generateQuiz(
    topicId: string,
    onProgress?: (partialText: string) => void
  ): Promise<{ questions: QuizQuestion[]; quizId: string }> {
    const headers = await this.getAuthHeaders();
    const body = { topicId };

    let accumulatedText = '';
    let quizId: string | null = null;

    const doRequest = () =>
      new Promise<{ questions: QuizQuestion[]; quizId: string }>((resolve, reject) => {
        sseClient.connect(
          `${API_URL}/quizzes`,
          body,
          {
            onMessage: (data) => {
              if (data?.type === 'meta' && typeof data.quizId === 'string') {
                quizId = data.quizId;
                return;
              }

              if (!data?.text) {
                return;
              }

              accumulatedText += data.text;
              onProgress?.(accumulatedText);
            },
            onError: (error) => {
              reject(error);
            },
            onComplete: () => {
              try {
                const validated = QuizQuestionsSchema.parse(this.extractJSON(accumulatedText));
                if (!quizId) {
                  throw new Error('Quiz stream did not provide quizId metadata');
                }

                resolve({
                  questions: validated.questions.map((question) => ({
                    question: question.question,
                    options: [question.option_0, question.option_1, question.option_2, question.option_3],
                    correctAnswer: question.correctAnswer,
                    explanation: question.explanation,
                  })),
                  quizId,
                });
              } catch (error) {
                reject(error);
              }
            },
          },
          {
            headers,
            credentials: 'include',
          }
        );
      });

    try {
      return await doRequest();
    } catch (error) {
      if (error instanceof SSEError && error.statusCode === 401) {
        await authService.refreshAccessToken();
        return doRequest();
      }
      throw error;
    }
  }

  async submitQuizAttempt(quizId: string, userAnswers: number[]): Promise<QuizResult> {
    const response = await authService.authenticatedFetch(`${API_URL}/quizzes/${quizId}/attempts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userAnswers }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit quiz attempt');
    }

    return (await response.json()) as QuizResult;
  }

  async getQuizHistory(topicId?: string): Promise<UserQuizWithDetails[]> {
    const params = new URLSearchParams();
    if (topicId) {
      params.set('topicId', topicId);
    }

    const query = params.toString();
    const response = await authService.authenticatedFetch(
      `${API_URL}/quizzes${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch quiz history');
    }

    const data = await response.json();
    return data.quizzes as UserQuizWithDetails[];
  }
}

export default new QuizService();
