import { and, eq, inArray } from 'drizzle-orm';
import { llmService } from '../llm/llm.service.js';
import { db } from '../shared/database/client.js';
import { quizTopics, topics, userQuizzes, userTopics } from '../shared/database/schema.js';
import { AppError } from '../shared/middleware/error-handler.js';
import { TopicRepository } from './topic.repository.js';
import {
    FlatTopicContentSchema,
    type DiscoverTopicRequest,
    type FlatTopicContent,
    type ListTopicsQuery,
    type TopicResponse,
} from './topic.schemas.js';

interface StreamCallbacks {
  onChunk: (text: string) => void;
  onMeta: (meta: { topicId: string; cached: boolean }) => void;
  onComplete: () => void;
}

interface TopicFacetOption {
  value: string;
  label: string;
  count?: number;
}

interface TopicFacetsResponse {
  categories: TopicFacetOption[];
  subcategoriesByCategory: Record<string, TopicFacetOption[]>;
}

export class TopicService {
  private topicRepository: TopicRepository;

  constructor() {
    this.topicRepository = new TopicRepository();
  }

  async discoverTopic(
    userId: string,
    request: DiscoverTopicRequest,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const cachedTopic = await this.topicRepository.findUnservedTopicForUser(userId, request);

    if (cachedTopic) {
      await this.streamCachedTopic(cachedTopic.id, this.toFlatTopicContent(cachedTopic), callbacks, signal);
      return;
    }

    const [alreadyDiscovered, dismissed] = await Promise.all([
      this.topicRepository.getDiscoveredTopicNames(userId),
      this.topicRepository.getDismissedTopicNames(userId),
    ]);

    let accumulatedText = '';

    await llmService.generateTopicStream(
      {
        mode: request.mode,
        alreadyDiscovered,
        dismissed,
        constraints: request.constraints,
      },
      {
        onChunk: (text) => {
          accumulatedText += text;
          callbacks.onChunk(text);
        },
        onComplete: () => {
          // Topic persistence and metadata emission happen after streaming concludes.
        },
      },
      signal
    );

    const parsed = this.extractJson(accumulatedText);
    const validated = FlatTopicContentSchema.parse(parsed);

    const topic = await this.getOrCreateTopic(validated);
    callbacks.onMeta({ topicId: topic.id, cached: false });
    callbacks.onComplete();
  }

  async getTopics(
    userId: string,
    filters: ListTopicsQuery
  ): Promise<{ topics: TopicResponse[]; total: number; page: number; limit: number }> {
    const { topics: rows, total } = await this.topicRepository.findUserTopics(userId, filters);

    return {
      topics: rows.map((row) => this.toTopicResponse(row.topic, row.userTopic)),
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }

  async getTopicDetail(userId: string, topicId: string): Promise<TopicResponse> {
    const [topic, userTopic] = await Promise.all([
      this.topicRepository.findById(topicId),
      this.topicRepository.findUserTopic(userId, topicId),
    ]);

    if (!topic || !userTopic) {
      throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND');
    }

    return this.toTopicResponse(topic, userTopic);
  }

  async getTopicFacets(userId: string): Promise<TopicFacetsResponse> {
    const rows = await this.topicRepository.getUserTopicFacetRows(userId);

    const categoryCounts = new Map<string, number>();
    const subcategoryCountsByCategory = new Map<string, Map<string, number>>();

    for (const row of rows) {
      categoryCounts.set(row.category, (categoryCounts.get(row.category) ?? 0) + row.count);

      const subcategoryCounts = subcategoryCountsByCategory.get(row.category) ?? new Map<string, number>();
      subcategoryCounts.set(row.subcategory, (subcategoryCounts.get(row.subcategory) ?? 0) + row.count);
      subcategoryCountsByCategory.set(row.category, subcategoryCounts);
    }

    const categories: TopicFacetOption[] = [{ value: 'all', label: 'All Categories' }];
    const subcategoriesByCategory: Record<string, TopicFacetOption[]> = {};

    for (const [category, total] of Array.from(categoryCounts.entries()).sort(([a], [b]) => a.localeCompare(b))) {
      categories.push({
        value: category,
        label: category,
        count: total,
      });

      const subcategoryCounts = subcategoryCountsByCategory.get(category) ?? new Map<string, number>();
      const options: TopicFacetOption[] = [{ value: 'all', label: 'All Subcategories' }];

      for (const [subcategory, count] of Array.from(subcategoryCounts.entries()).sort(([a], [b]) => a.localeCompare(b))) {
        options.push({
          value: subcategory,
          label: subcategory,
          count,
        });
      }

      subcategoriesByCategory[category] = options;
    }

    return {
      categories,
      subcategoriesByCategory,
    };
  }

  async updateTopicStatus(
    userId: string,
    topicId: string,
    status: 'discovered' | 'dismissed',
    discoveryMethod?: 'surprise' | 'guided'
  ) {
    const topic = await this.topicRepository.findById(topicId);
    if (!topic) {
      throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND');
    }

    const existingUserTopic = await this.topicRepository.findUserTopic(userId, topicId);

    if (!existingUserTopic) {
      if (!discoveryMethod) {
        throw new AppError('discoveryMethod is required for first topic interaction', 400, 'DISCOVERY_METHOD_REQUIRED');
      }

      return this.topicRepository.createUserTopic({
        userId,
        topicId,
        status,
        discoveryMethod,
        discoveredAt: new Date(),
      });
    }

    const updated = await this.topicRepository.updateUserTopicStatus(userId, topicId, status);
    if (!updated) {
      throw new AppError('Failed to update topic status', 500, 'TOPIC_STATUS_UPDATE_FAILED');
    }

    return updated;
  }

  async markTopicLearned(userId: string, topicId: string): Promise<void> {
    const existing = await this.topicRepository.findUserTopic(userId, topicId);
    if (!existing) {
      throw new AppError('Topic relationship not found', 404, 'USER_TOPIC_NOT_FOUND');
    }

    await this.topicRepository.updateUserTopicStatus(userId, topicId, 'learned', new Date());
  }

  async deleteUserTopic(userId: string, topicId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const linkedQuizRows = await tx
        .select({ quizId: quizTopics.quizId })
        .from(quizTopics)
        .where(eq(quizTopics.topicId, topicId));

      const quizIds = linkedQuizRows.map((row) => row.quizId);

      if (quizIds.length > 0) {
        await tx
          .delete(userQuizzes)
          .where(and(eq(userQuizzes.userId, userId), inArray(userQuizzes.quizId, quizIds)));
      }

      await tx
        .delete(userTopics)
        .where(and(eq(userTopics.userId, userId), eq(userTopics.topicId, topicId)));
    });
  }

  private async getOrCreateTopic(flatTopic: FlatTopicContent) {
    const existing = await this.topicRepository.findByName(flatTopic.name);
    if (existing) {
      return existing;
    }

    return this.topicRepository.create({
      name: flatTopic.name,
      topicType: flatTopic.topicType,
      category: flatTopic.category,
      subcategory: flatTopic.subcategory,
      contentWhat: flatTopic.what,
      contentWhy: flatTopic.why,
      contentPros: [
        flatTopic.pro_0,
        flatTopic.pro_1,
        flatTopic.pro_2,
        flatTopic.pro_3,
        flatTopic.pro_4,
      ],
      contentCons: [
        flatTopic.con_0,
        flatTopic.con_1,
        flatTopic.con_2,
        flatTopic.con_3,
        flatTopic.con_4,
      ],
      contentCompareToSimilar: [
        { topic: flatTopic.compare_0_tech, comparison: flatTopic.compare_0_text },
        { topic: flatTopic.compare_1_tech, comparison: flatTopic.compare_1_text },
      ],
    });
  }

  private extractJson(text: string) {
    const cleaned = text.trim();

    const jsonBlockMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      return JSON.parse(jsonBlockMatch[1].trim());
    }

    const codeBlockMatch = cleaned.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim());
    }

    return JSON.parse(cleaned);
  }

  private toTopicResponse(topic: typeof topics.$inferSelect, userTopic: { status: string; discoveryMethod: string; discoveredAt: Date; learnedAt: Date | null }): TopicResponse {
    return {
      id: topic.id,
      name: topic.name,
      topicType: topic.topicType as TopicResponse['topicType'],
      category: topic.category,
      subcategory: topic.subcategory,
      content: {
        what: topic.contentWhat,
        why: topic.contentWhy,
        pros: (topic.contentPros as string[]) ?? [],
        cons: (topic.contentCons as string[]) ?? [],
        compareToSimilar: (topic.contentCompareToSimilar as { topic: string; comparison: string }[]) ?? [],
      },
      status: userTopic.status as TopicResponse['status'],
      discoveryMethod: userTopic.discoveryMethod as TopicResponse['discoveryMethod'],
      discoveredAt: userTopic.discoveredAt.toISOString(),
      learnedAt: userTopic.learnedAt ? userTopic.learnedAt.toISOString() : null,
    };
  }

  private toFlatTopicContent(topic: typeof topics.$inferSelect): FlatTopicContent {
    const pros = (topic.contentPros as string[]) ?? [];
    const cons = (topic.contentCons as string[]) ?? [];
    const comparisons = (topic.contentCompareToSimilar as { topic: string; comparison: string }[]) ?? [];

    return {
      name: topic.name,
      topicType: topic.topicType as FlatTopicContent['topicType'],
      category: topic.category,
      subcategory: topic.subcategory,
      what: topic.contentWhat,
      why: topic.contentWhy,
      pro_0: pros[0] ?? '',
      pro_1: pros[1] ?? '',
      pro_2: pros[2] ?? '',
      pro_3: pros[3] ?? '',
      pro_4: pros[4] ?? '',
      con_0: cons[0] ?? '',
      con_1: cons[1] ?? '',
      con_2: cons[2] ?? '',
      con_3: cons[3] ?? '',
      con_4: cons[4] ?? '',
      compare_0_tech: comparisons[0]?.topic ?? '',
      compare_0_text: comparisons[0]?.comparison ?? '',
      compare_1_tech: comparisons[1]?.topic ?? '',
      compare_1_text: comparisons[1]?.comparison ?? '',
    };
  }

  private async streamCachedTopic(
    topicId: string,
    flatTopic: FlatTopicContent,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const payload = JSON.stringify(flatTopic);

    for (let index = 0; index < payload.length; index += 32) {
      if (signal?.aborted) {
        throw new AppError('Topic stream aborted', 499, 'TOPIC_STREAM_ABORTED');
      }

      callbacks.onChunk(payload.slice(index, index + 32));
      await this.delay(12);
    }

    callbacks.onMeta({ topicId, cached: true });
    callbacks.onComplete();
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
