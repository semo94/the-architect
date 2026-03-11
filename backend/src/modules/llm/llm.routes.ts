import { FastifyInstance } from 'fastify';
import { LLMController } from './llm.controller.js';

export async function llmRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new LLMController();

  fastify.get('/categories', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    await controller.getCategories(request, reply);
  });

  fastify.post('/topic', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    await controller.generateTopic(request, reply);
  });

  fastify.post('/quiz', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    await controller.generateQuiz(request, reply);
  });
}
