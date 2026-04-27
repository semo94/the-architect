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
          onLearningResources: (resources) => {
            reply.raw.write(`data: ${JSON.stringify({ type: 'learningResources', resources })}\n\n`);
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

  async triggerHyperlinks(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = TopicIdParamSchema.parse(request.params);
    const result = await this.topicService.triggerHyperlinks(id);
    reply.status(202).send(result);
  }

  async getInsights(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;
    const { id } = TopicIdParamSchema.parse(request.params);
    const insights = await this.topicService.getInsights(userId, id);
    reply.send(insights);
  }

  async triggerInsights(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = TopicIdParamSchema.parse(request.params);
    const result = await this.topicService.triggerInsights(id);
    reply.status(202).send(result);
  }

  async getTopicEvents(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;
    const { id } = TopicIdParamSchema.parse(request.params);
    startSseResponse(request, reply);

    const POLL_INTERVAL_MS = 3000;
    const MAX_POLLS = 40; // 2 minutes max
    let polls = 0;

    const sendEvent = (data: unknown) => {
      if (!reply.raw.destroyed) {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    reply.raw.on('close', () => {
      polls = MAX_POLLS + 1; // Stop polling
    });

    const poll = async (): Promise<void> => {
      if (polls++ >= MAX_POLLS || reply.raw.destroyed) {
        reply.raw.end();
        return;
      }

      try {
        const topic = await this.topicService.getTopicDetail(userId, id);
        const bothReady = topic.hyperlinksStatus === 'ready' && topic.insightsStatus === 'ready';
        const anyProcessing = topic.hyperlinksStatus === 'processing' || topic.insightsStatus === 'processing';

        sendEvent({
          type: 'status',
          hyperlinksStatus: topic.hyperlinksStatus,
          insightsStatus: topic.insightsStatus,
          hyperlinks: topic.hyperlinks,
        });

        if (bothReady || !anyProcessing) {
          sendEvent({ type: 'done' });
          reply.raw.end();
          return;
        }
      } catch {
        sendEvent({ type: 'error' });
        reply.raw.end();
        return;
      }

      setTimeout(() => { void poll(); }, POLL_INTERVAL_MS);
    };

    void poll();
  }
}
