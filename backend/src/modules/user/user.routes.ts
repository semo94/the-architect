import { FastifyInstance } from 'fastify';
import { UserController } from './user.controller.js';

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new UserController();

  // All user routes require authentication
  fastify.addHook('onRequest', async (request) => {
    await request.jwtVerify();
  });

  // GET /users/me - Get current authenticated user
  fastify.get('/me', async (request, reply) => {
    await controller.getCurrentUser(request, reply);
  });

  // PATCH /users/me - Update current authenticated user
  fastify.patch('/me', async (request, reply) => {
    await controller.updateCurrentUser(request, reply);
  });
}
