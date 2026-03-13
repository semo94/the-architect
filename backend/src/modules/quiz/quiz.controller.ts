import { FastifyReply, FastifyRequest } from 'fastify';
import { startSseResponse } from '../shared/utils/sse.utils.js';
import {
    GenerateQuizRequestSchema,
    ListQuizzesQuerySchema,
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

    startSseResponse(request, reply);

    const abortController = new AbortController();
    let streamDone = false;

    reply.raw.on('close', () => {
      if (!streamDone) {
        abortController.abort();
      }
    });

    try {
      await this.quizService.generateQuiz(
        userId,
        body,
        {
          onChunk: (text) => {
            reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`);
          },
          onMeta: (meta) => {
            reply.raw.write(`data: ${JSON.stringify({ type: 'meta', ...meta })}\n\n`);
          },
          onComplete: () => {
            streamDone = true;
            reply.raw.write('data: [DONE]\n\n');
            reply.raw.end();
          },
        },
        abortController.signal
      );
    } catch (error) {
      streamDone = true;
      if (reply.raw.destroyed) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Quiz stream failed';
      request.log.error({ err: error }, 'generateQuiz stream error');
      reply.raw.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      reply.raw.end();
    }
  }

  async listQuizzes(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;
    const query = ListQuizzesQuerySchema.parse(request.query);
    const quizzes = await this.quizService.getQuizHistory(userId, query.topicId);
    reply.send({ quizzes });
  }

  async getQuizDetail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;
    const { id } = QuizIdParamSchema.parse(request.params);
    const history = await this.quizService.getQuizHistory(userId);
    const quiz = history.find((entry) => entry.quizId === id);

    if (!quiz) {
      reply.status(404).send({ error: 'Quiz not found', code: 'QUIZ_NOT_FOUND', statusCode: 404 });
      return;
    }

    reply.send({ quiz });
  }

  async submitQuizAttempt(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;
    const { id } = QuizIdParamSchema.parse(request.params);
    const body = SubmitQuizAttemptRequestSchema.parse(request.body);

    const result = await this.quizService.submitQuizAttempt(userId, id, body);
    reply.status(201).send(result);
  }
}
