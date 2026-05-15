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

    const sseLog = request.log.child({
      component: 'sse',
      stream: 'discover_topic',
      userId,
      mode: body.mode,
      topicId: body.topicId,
    });

    sseLog.info(
      { topicName: body.topicName ?? null },
      'sse stream opened'
    );

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
      await this.topicService.discoverTopic(
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
          onLearningResources: (resources) => {
            sseLog.info({ resourceCount: resources.length }, 'sse learning resources');
            reply.raw.write(`data: ${JSON.stringify({ type: 'learningResources', resources })}\n\n`);
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

      const message = error instanceof Error ? error.message : 'Topic stream failed';
      sseLog.error({ err: error, chunkCount }, 'discoverTopic stream error');
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

    const sseLog = request.log.child({
      component: 'sse',
      stream: 'topic_events',
      userId,
      topicId: id,
    });
    sseLog.info({}, 'sse stream opened');

    const POLL_INTERVAL_MS = 3000;
    const MAX_POLLS = 40; // 2 minutes max
    let polls = 0;

    const sendEvent = (data: unknown) => {
      if (!reply.raw.destroyed) {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    reply.raw.on('close', () => {
      sseLog.info({ polls, reason: polls > MAX_POLLS ? 'max_polls' : 'client_close' }, 'sse connection closed');
      polls = MAX_POLLS + 1; // Stop polling
    });

    const poll = async (): Promise<void> => {
      if (polls++ >= MAX_POLLS || reply.raw.destroyed) {
        sseLog.info({ polls }, 'sse poll loop ended');
        reply.raw.end();
        return;
      }

      try {
        const topic = await this.topicService.getTopicDetail(userId, id);
        const bothReady = topic.hyperlinksStatus === 'ready' && topic.insightsStatus === 'ready';
        const anyProcessing = topic.hyperlinksStatus === 'processing' || topic.insightsStatus === 'processing';

        sseLog.debug(
          {
            poll: polls,
            hyperlinksStatus: topic.hyperlinksStatus,
            insightsStatus: topic.insightsStatus,
          },
          'sse status poll'
        );

        sendEvent({
          type: 'status',
          hyperlinksStatus: topic.hyperlinksStatus,
          insightsStatus: topic.insightsStatus,
          hyperlinks: topic.hyperlinks,
        });

        if (bothReady || !anyProcessing) {
          sendEvent({ type: 'done' });
          sseLog.info({ polls }, 'sse topic events completed');
          reply.raw.end();
          return;
        }
      } catch (err) {
        sseLog.error({ err, polls }, 'sse topic events poll error');
        sendEvent({ type: 'error' });
        reply.raw.end();
        return;
      }

      setTimeout(() => { void poll(); }, POLL_INTERVAL_MS);
    };

    void poll();
  }
}
