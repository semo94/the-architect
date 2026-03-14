import { FastifyInstance } from 'fastify';
import { UserController } from './user.controller.js';

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new UserController();

  // All user routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /users/me - Get current authenticated user
  fastify.get('/me', async (request, reply) => {
    await controller.getCurrentUser(request, reply);
  });

  // PATCH /users/me - Update current authenticated user
  fastify.patch('/me', async (request, reply) => {
    await controller.updateCurrentUser(request, reply);
  });

  // GET /users/me/stats - Get current user stats and milestones
  fastify.get('/me/stats', async (request, reply) => {
    await controller.getCurrentUserStats(request, reply);
  });
}
