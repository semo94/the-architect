import { FastifyInstance } from 'fastify';
import { LLMController } from './llm.controller.js';

export async function llmRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new LLMController();

  fastify.get('/categories', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    await controller.getCategories(request, reply);
  });
}
