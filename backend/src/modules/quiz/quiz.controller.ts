import { FastifyReply, FastifyRequest } from 'fastify';
import { startSseResponse } from '../shared/utils/sse.utils.js';
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

    startSseResponse(request, reply);

    const sseLog = request.log.child({
      component: 'sse',
      stream: 'generate_quiz',
      userId,
      topicId: body.topicId,
    });
    sseLog.info({}, 'sse stream opened');

    const abortController = new AbortController();
    let streamDone = false;
    let chunkCount = 0;

    reply.raw.on('close', () => {
      sseLog.info(
        { streamDone, chunkCount, reason: streamDone ? 'complete' : 'client_close' },
        'sse connection closed'
      );
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
            chunkCount += 1;
            if (chunkCount === 1 || chunkCount % 50 === 0) {
              sseLog.debug({ chunkCount, deltaChars: text.length }, 'sse chunk');
            }
            reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`);
          },
          onMeta: (meta) => {
            sseLog.info({ meta }, 'sse meta');
            reply.raw.write(`data: ${JSON.stringify({ type: 'meta', ...meta })}\n\n`);
          },
          onComplete: () => {
            streamDone = true;
            sseLog.info({ chunkCount }, 'sse stream completed');
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
      sseLog.error({ err: error, chunkCount }, 'generateQuiz stream error');
      reply.raw.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      reply.raw.end();
    }
  }

  async submitQuizAttempt(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;
    const { id } = QuizIdParamSchema.parse(request.params);
    const body = SubmitQuizAttemptRequestSchema.parse(request.body);

    const result = await this.quizService.submitQuizAttempt(userId, id, body);
    reply.status(201).send(result);
  }
}
