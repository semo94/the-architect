import { FastifyReply, FastifyRequest } from 'fastify';
import { startSseResponse } from '../shared/utils/sse.utils.js';
import categorySchema from './categories.js';
import {
  GenerateQuizRequestSchema,
  GenerateTopicRequestSchema,
} from './llm.schemas.js';
import { llmService } from './llm.service.js';

export class LLMController {
  async getCategories(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send(categorySchema);
  }

  async generateTopic(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = GenerateTopicRequestSchema.parse(request.body);
    startSseResponse(request, reply);

    const abortController = new AbortController();
    let streamDone = false;
    reply.raw.on('close', () => { if (!streamDone) abortController.abort(); });

    try {
      await llmService.generateTopicStream(
        body,
        {
          onChunk: (text) => {
            reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`);
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
      const message = error instanceof Error ? error.message : 'LLM stream failed';
      request.log.error({ err: error }, 'generateTopic stream error');
      streamDone = true;
      reply.raw.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      reply.raw.end();
    }
  }

  async generateQuiz(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = GenerateQuizRequestSchema.parse(request.body);
    startSseResponse(request, reply);

    const abortController = new AbortController();
    let streamDone = false;
    reply.raw.on('close', () => { if (!streamDone) abortController.abort(); });

    try {
      await llmService.generateQuizStream(
        body,
        {
          onChunk: (text) => {
            reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`);
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
      const message = error instanceof Error ? error.message : 'LLM stream failed';
      request.log.error({ err: error }, 'generateQuiz stream error');
      streamDone = true;
      reply.raw.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      reply.raw.end();
    }
  }
}
