import { FastifyReply, FastifyRequest } from 'fastify';
import { startSseResponse } from '../shared/utils/sse.utils.js';
import {
    DiscoverTopicRequestSchema,
    ListTopicsQuerySchema,
    TopicIdParamSchema,
    UpdateTopicStatusRequestSchema,
} from './topic.schemas.js';
import { TopicService } from './topic.service.js';

export class TopicController {
  private topicService: TopicService;

  constructor() {
    this.topicService = new TopicService();
  }

  async discoverTopic(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = DiscoverTopicRequestSchema.parse(request.body);
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
      await this.topicService.discoverTopic(
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

      const message = error instanceof Error ? error.message : 'Topic stream failed';
      request.log.error({ err: error }, 'discoverTopic stream error');
      reply.raw.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      reply.raw.end();
    }
  }

  async listTopics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;
    const query = ListTopicsQuerySchema.parse(request.query);
    const result = await this.topicService.getTopics(userId, query);
    reply.send(result);
  }

  async getTopicFacets(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;
    const facets = await this.topicService.getTopicFacets(userId);
    reply.send(facets);
  }

  async getTopicDetail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;
    const { id } = TopicIdParamSchema.parse(request.params);
    const topic = await this.topicService.getTopicDetail(userId, id);
    reply.send(topic);
  }

  async updateTopicStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;
    const { id } = TopicIdParamSchema.parse(request.params);
    const body = UpdateTopicStatusRequestSchema.parse(request.body);

    const updated = await this.topicService.updateTopicStatus(
      userId,
      id,
      body.status,
      body.discoveryMethod
    );

    reply.send({
      id: updated.id,
      topicId: updated.topicId,
      status: updated.status,
      discoveryMethod: updated.discoveryMethod,
      discoveredAt: updated.discoveredAt.toISOString(),
      learnedAt: updated.learnedAt ? updated.learnedAt.toISOString() : null,
    });
  }

  async deleteUserTopic(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;
    const { id } = TopicIdParamSchema.parse(request.params);
    await this.topicService.deleteUserTopic(userId, id);
    reply.status(204).send();
  }
}
