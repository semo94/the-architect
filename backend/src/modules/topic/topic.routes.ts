import { FastifyInstance } from 'fastify';
import { TopicController } from './topic.controller.js';

export async function topicRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new TopicController();

  fastify.addHook('onRequest', fastify.authenticate);

  fastify.post('/', async (request, reply) => {
    await controller.discoverTopic(request, reply);
  });

  fastify.get('/', async (request, reply) => {
    await controller.listTopics(request, reply);
  });

  fastify.get('/facets', async (request, reply) => {
    await controller.getTopicFacets(request, reply);
  });

  fastify.get('/:id', async (request, reply) => {
    await controller.getTopicDetail(request, reply);
  });

  fastify.patch('/:id', async (request, reply) => {
    await controller.updateTopicStatus(request, reply);
  });

  fastify.delete('/:id', async (request, reply) => {
    await controller.deleteUserTopic(request, reply);
  });
}
