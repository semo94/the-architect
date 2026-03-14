import { FastifyInstance } from 'fastify';
import { QuizController } from './quiz.controller.js';

export async function quizRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new QuizController();

  fastify.addHook('onRequest', fastify.authenticate);

  fastify.post('/', async (request, reply) => {
    await controller.generateQuiz(request, reply);
  });

  fastify.post('/:id/attempts', async (request, reply) => {
    await controller.submitQuizAttempt(request, reply);
  });
}
