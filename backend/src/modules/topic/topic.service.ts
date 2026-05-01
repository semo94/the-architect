import { and, eq, inArray } from 'drizzle-orm';
import { llmService } from '../llm/llm.service.js';
import { env } from '../shared/config/env.js';
import { db } from '../shared/database/client.js';
import { quizTopics, topics, userQuizzes, userTopics } from '../shared/database/schema.js';
import { embeddingService } from '../shared/embedding/embedding.service.js';
import { AppError } from '../shared/middleware/error-handler.js';
import { linkResourceService } from './link-resource.service.js';
import { TopicRepository } from './topic.repository.js';
import { LOW_CONFIDENCE_THRESHOLD, TopicResolver, type ResolveInput } from './topic.resolver.js';
import {
  FlatTopicContentSchema,
  type DiscoverTopicRequest,
  type FlatTopicContent,
  type HyperlinkItem,
  type HyperlinksResponse,
  type InsightGroup,
  type InsightsResponse,
  type ListTopicsQuery,
  type TopicListItemResponse,
  type TopicResponse,
} from './topic.schemas.js';
import { extractMentionedTopics, stripMarkers } from './topic.utils.js';

interface StreamCallbacks {
  onChunk: (text: string) => void;
  onMeta: (meta: { topicId: string; cached: boolean }) => void;
  onLearningResources: (resources: { title: string; url: string }[]) => void;
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
  private resolver: TopicResolver;

  constructor() {
    this.topicRepository = new TopicRepository();
    this.resolver = new TopicResolver(this.topicRepository);
  }

  async discoverTopic(
    userId: string,
    request: DiscoverTopicRequest,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    // deep_link: navigate directly to a known topic (no LLM generation)
    if (request.mode === 'deep_link') {
      return this.discoverDeepLinkTopic(userId, request, callbacks);
    }

    const cachedTopic = await this.topicRepository.findUnservedTopicForUser(userId, request);

    if (cachedTopic) {
      const existingResources = (cachedTopic.learningResources as { title: string; url: string }[]) ?? [];

      if (existingResources.length > 0) {
        // Resources exist — stream them immediately; refresh in background if stale
        await this.streamCachedTopic(cachedTopic.id, this.toFlatTopicContent(cachedTopic), callbacks, signal);
        this.triggerLearningResourcesRefreshIfNeeded(cachedTopic);
      } else {
        // No resources — fetch synchronously so they appear in the SSE response
        const resources = await this.fetchLearningResources(cachedTopic);
        const enrichedFlat = this.toFlatTopicContent(cachedTopic, resources);
        await this.streamCachedTopic(cachedTopic.id, enrichedFlat, callbacks, signal);
      }
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

    const topic = await this.persistGeneratedTopic(validated);
    const resources = await this.fetchLearningResources(topic);
    if (resources.length > 0) {
      callbacks.onLearningResources(resources);
    }

    callbacks.onMeta({ topicId: topic.id, cached: false });
    callbacks.onComplete();
  }

  async getTopics(
    userId: string,
    filters: ListTopicsQuery
  ): Promise<{ topics: TopicListItemResponse[]; total: number; page: number; limit: number }> {
    const { topics: rows, total } = await this.topicRepository.findUserTopics(userId, filters);

    return {
      topics: rows.map((row) => this.toTopicListItemResponse(row.topic, row.userTopic)),
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }

  async getTopicDetail(userId: string, topicId: string): Promise<TopicResponse> {
    const [topic, userTopic, hyperlinks] = await Promise.all([
      this.topicRepository.findById(topicId),
      this.topicRepository.findUserTopic(userId, topicId),
      this.topicRepository.findHyperlinks(topicId, userId),
    ]);

    if (!topic || !userTopic) {
      throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND');
    }

    const existingResources = (topic.learningResources as { title: string; url: string }[]) ?? [];

    if (existingResources.length === 0) {
      // No resources yet — fetch synchronously so the response includes them
      const resources = await this.fetchLearningResources(topic);
      return this.toTopicResponse(topic, userTopic, hyperlinks, resources);
    }

    // Resources exist — serve them and refresh in background if stale
    this.triggerLearningResourcesRefreshIfNeeded(topic);
    return this.toTopicResponse(topic, userTopic, hyperlinks);
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
    discoveryMethod?: 'surprise' | 'guided' | 'deep_link'
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

  private toTopicListItemResponse(topic: typeof topics.$inferSelect, userTopic: { status: string; discoveryMethod: string; discoveredAt: Date; learnedAt: Date | null }): TopicListItemResponse {
    return {
      id: topic.id,
      name: topic.name,
      topicType: topic.topicType as TopicListItemResponse['topicType'],
      category: topic.category,
      subcategory: topic.subcategory,
      contentWhat: topic.contentWhat,
      status: userTopic.status as TopicListItemResponse['status'],
      discoveryMethod: userTopic.discoveryMethod as TopicListItemResponse['discoveryMethod'],
      discoveredAt: userTopic.discoveredAt.toISOString(),
      learnedAt: userTopic.learnedAt ? userTopic.learnedAt.toISOString() : null,
    };
  }

  private toTopicResponse(
    topic: typeof topics.$inferSelect,
    userTopic: { status: string; discoveryMethod: string; discoveredAt: Date; learnedAt: Date | null },
    hyperlinks: HyperlinkItem[] = [],
    resourcesOverride?: { title: string; url: string }[]
  ): TopicResponse {
    const learningResources = resourcesOverride ?? (topic.learningResources as { title: string; url: string }[]) ?? [];
    return {
      id: topic.id,
      name: topic.name,
      topicType: topic.topicType as TopicResponse['topicType'],
      category: topic.category,
      subcategory: topic.subcategory,
      contentWhat: topic.contentWhat,
      hyperlinksStatus: (topic.hyperlinksStatus as TopicResponse['hyperlinksStatus']) ?? null,
      insightsStatus: (topic.insightsStatus as TopicResponse['insightsStatus']) ?? null,
      hyperlinks,
      content: {
        what: topic.contentWhat,
        why: topic.contentWhy,
        pros: (topic.contentPros as string[]) ?? [],
        cons: (topic.contentCons as string[]) ?? [],
        compareToSimilar: (topic.contentCompareToSimilar as { topic: string; comparison: string }[]) ?? [],
        learningResources,
      },
      status: userTopic.status as TopicResponse['status'],
      discoveryMethod: userTopic.discoveryMethod as TopicResponse['discoveryMethod'],
      discoveredAt: userTopic.discoveredAt.toISOString(),
      learnedAt: userTopic.learnedAt ? userTopic.learnedAt.toISOString() : null,
    };
  }

  private toFlatTopicContent(
    topic: typeof topics.$inferSelect,
    resourcesOverride?: { title: string; url: string }[]
  ): FlatTopicContent {
    const pros = (topic.contentPros as string[]) ?? [];
    const cons = (topic.contentCons as string[]) ?? [];
    const comparisons = (topic.contentCompareToSimilar as { topic: string; comparison: string }[]) ?? [];
    const resources = resourcesOverride ?? (topic.learningResources as { title: string; url: string }[]) ?? [];

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
      compare_0_tech: stripMarkers(comparisons[0]?.topic ?? ''),
      compare_0_text: comparisons[0]?.comparison ?? '',
      compare_1_tech: stripMarkers(comparisons[1]?.topic ?? ''),
      compare_1_text: comparisons[1]?.comparison ?? '',
      resource_0_title: resources[0]?.title,
      resource_0_url: resources[0]?.url,
      resource_1_title: resources[1]?.title,
      resource_1_url: resources[1]?.url,
      resource_2_title: resources[2]?.title,
      resource_2_url: resources[2]?.url,
      resource_3_title: resources[3]?.title,
      resource_3_url: resources[3]?.url,
      resource_4_title: resources[4]?.title,
      resource_4_url: resources[4]?.url,
    };
  }

  /**
   * Synchronously fetch learning resources for a topic and persist them.
   * Returns [] on failure — learning resources are non-critical.
   */
  private async fetchLearningResources(topic: typeof topics.$inferSelect): Promise<{ title: string; url: string }[]> {
    if (!env.BRAVE_API_KEY) return [];

    try {
      linkResourceService.recordRefreshAttempt(topic.id);
      const resources = await linkResourceService.getLearningResourcesForTopic({
        name: topic.name,
        category: topic.category,
        subcategory: topic.subcategory,
      });
      await this.topicRepository.updateLearningResources(topic.id, resources);
      return resources;
    } catch {
      return [];
    }
  }

  private triggerLearningResourcesRefreshIfNeeded(topic: typeof topics.$inferSelect): void {
    if (!env.BRAVE_API_KEY) return;
    if (linkResourceService.hasCooldown(topic.id)) return;

    const existing = (topic.learningResources as { title: string; url: string }[]) ?? [];
    const isStale = linkResourceService.isStale(topic.learningResourcesLastRefreshedAt ?? null);
    if (existing.length > 0 && !isStale) return;

    linkResourceService.recordRefreshAttempt(topic.id);

    void Promise.resolve().then(async () => {
      try {
        const resources = await linkResourceService.getLearningResourcesForTopic({
          name: topic.name,
          category: topic.category,
          subcategory: topic.subcategory,
        });
        await this.topicRepository.updateLearningResources(topic.id, resources);
      } catch {
        // Silently fail — learning resources are non-critical
      }
    });
  }

  private async streamCachedTopic(    topicId: string,
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

  /**
   * Persists an LLM-generated topic. Centralises the post-LLM dedup-and-create
   * pipeline used by all generation paths (surprise / guided / deep_link):
   *
   *   1. Run the entity resolver against `validated.name`. If it matches an
   *      existing topic, abandon the insert and return that topic
   *      (the LLM picked a synonym of an entity we already track).
   *   2. Otherwise, upsert the topic, record its primary alias, mark
   *      hyperlink+insight extraction as processing, and kick off the async
   *      jobs. The async jobs run a post-create reverse-resolution pass that
   *      flips any prior unresolved relationships pointing to this entity.
   *
   * Returns the persisted (or rescued) topic row.
   */
  private async persistGeneratedTopic(
    validated: FlatTopicContent,
    requestedName?: string
  ): Promise<typeof topics.$inferSelect> {
    let candidateEmbedding: number[] | null = null;
    try {
      candidateEmbedding = await embeddingService.embedText(validated.name);
    } catch {
      // proceed with Tier-0-only resolution
    }

    const outcome = await this.resolver.resolve({
      candidateName: validated.name,
      candidateEmbedding,
      aliasSource: 'name',
      contextHint: requestedName ? { sourceName: requestedName } : null,
    });

    if (!outcome.isNew) {
      const existing = await this.topicRepository.findById(outcome.topicId);
      if (existing) {
        console.log(JSON.stringify({
          tag: 'entity_resolution',
          event: 'dedup_rescued',
          candidate: validated.name,
          rescuedTopicId: existing.id,
          confidence: outcome.confidence,
        }));
        return existing;
      }
      // Defensive: alias pointed to a deleted topic — fall through to insert
    }

    const topic = await this.topicRepository.upsertTopic({
      name: validated.name,
      topicType: validated.topicType,
      category: validated.category,
      subcategory: validated.subcategory,
      contentWhat: validated.what,
      contentWhy: validated.why,
      contentPros: [
        validated.pro_0, validated.pro_1, validated.pro_2, validated.pro_3, validated.pro_4,
      ],
      contentCons: [
        validated.con_0, validated.con_1, validated.con_2, validated.con_3, validated.con_4,
      ],
      contentCompareToSimilar: [
        { topic: validated.compare_0_tech, comparison: validated.compare_0_text },
        { topic: validated.compare_1_tech, comparison: validated.compare_1_text },
      ],
    });

    // Record the topic's primary name as its first alias. Idempotent.
    await this.resolver.recordPrimaryAlias(topic.id, topic.name, candidateEmbedding);

    await this.topicRepository.setProcessingStatus(topic.id, {
      hyperlinksStatus: 'processing',
      hyperlinksStartedAt: new Date(),
      insightsStatus: 'processing',
      insightsStartedAt: new Date(),
    });

    void this.runHyperlinkExtractionAsync(topic.id, validated);
    void this.runInsightGenerationAsync(topic);
    void this.reverseResolveUnresolvedRelationships(topic.id, candidateEmbedding);

    return topic;
  }

  /**
   * After a new topic is created, re-evaluate any previously unresolved
   * relationship rows that may now refer to this newly-created entity.
   *
   * Strategy:
   *   1. Cheap exact-name pass — resolves rows whose `target_name` literally
   *      matches the new topic's primary name (case-insensitive). No LLM cost.
   *   2. Vector pre-filter — fetch unresolved rows whose
   *      `target_name_embedding` is within LOW_CONFIDENCE_THRESHOLD cosine of
   *      the new topic's embedding.
   *   3. Batched judge — feed pre-filtered rows through the resolver in a
   *      single judge LLM call. Only rows the judge confirms (or that fall in
   *      the high-confidence band) are flipped.
   *
   * Fire-and-forget; failures are logged but don't fail the parent request.
   */
  private async reverseResolveUnresolvedRelationships(
    topicId: string,
    topicEmbedding: number[] | null
  ): Promise<void> {
    try {
      const topic = await this.topicRepository.findById(topicId);
      if (!topic) return;

      // Tier 0 — cheap exact-name reverse pass via SQL.
      // Catches unresolved rows whose target_name_embedding is NULL (stored
      // when the embedding service was unavailable at extraction time) and
      // would therefore be invisible to the vector pre-filter below.
      const exactIds = await this.topicRepository.findUnresolvedRelationshipsByExactName(topic.name);
      if (exactIds.length > 0) {
        await this.topicRepository.resolveRelationships(exactIds, topicId);
        console.log(JSON.stringify({
          tag: 'entity_resolution',
          event: 'reverse_resolve_exact',
          topicId,
          flippedCount: exactIds.length,
        }));
      }

      if (!topicEmbedding) return;

      const exactIdSet = new Set(exactIds);
      const candidates = (await this.topicRepository.findUnresolvedRelationshipsNear(
        topicEmbedding,
        LOW_CONFIDENCE_THRESHOLD,
        50
      // Skip rows already resolved by the exact-name pass above.
      )).filter((c) => !exactIdSet.has(c.relationshipId));
      if (candidates.length === 0) return;

      // Build resolver inputs. The candidate embedding is the relationship's
      // own target_name_embedding (already in DB); no extra LLM cost.
      const inputs: ResolveInput[] = candidates.map((c) => ({
        candidateName: c.targetName,
        candidateEmbedding: c.targetNameEmbedding,
        aliasSource: 'hyperlink_marker', // any relationship; alias source is informational
        contextHint: { sourceName: topic.name, sourceCategory: topic.category },
      }));

      const outcomes = await this.resolver.resolveBatch(inputs);

      const toFlip: string[] = [];
      for (let i = 0; i < outcomes.length; i++) {
        const outcome = outcomes[i];
        if (!outcome.isNew && outcome.topicId === topicId) {
          toFlip.push(candidates[i].relationshipId);
        }
      }

      if (toFlip.length > 0) {
        await this.topicRepository.resolveRelationships(toFlip, topicId);
        console.log(JSON.stringify({
          tag: 'entity_resolution',
          event: 'reverse_resolve',
          topicId,
          flippedCount: toFlip.length,
          consideredCount: candidates.length,
        }));
      }
    } catch (err) {
      console.log(JSON.stringify({
        tag: 'entity_resolution',
        event: 'reverse_resolve_error',
        topicId,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  // ---------------------------------------------------------------------------
  // Smart Navigation methods
  // ---------------------------------------------------------------------------

  /**
   * deep_link mode: find an existing topic by exact match or embedding similarity and stream it back.
   * If the topic doesn't exist yet (unresolved hyperlink), generates it via LLM.
   * Ownership is created only when the user explicitly acts on the preview.
   */
  private async discoverDeepLinkTopic(
    userId: string,
    request: DiscoverTopicRequest,
    callbacks: StreamCallbacks
  ): Promise<void> {
    let topic: typeof topics.$inferSelect | undefined;

    if (request.topicId) {
      topic = await this.topicRepository.findById(request.topicId) ?? undefined;
    } else if (request.topicName) {
      let candidateEmbedding: number[] | null = null;
      try {
        candidateEmbedding = await embeddingService.embedText(request.topicName);
      } catch {
        // fall through to Tier-0-only resolution
      }

      const outcome = await this.resolver.resolve({
        candidateName: request.topicName,
        candidateEmbedding,
        aliasSource: 'user_query',
      });

      if (!outcome.isNew) {
        topic = await this.topicRepository.findById(outcome.topicId) ?? undefined;
      }
    }

    if (!topic) {
      // Topic doesn't exist yet — generate it via LLM using the provided name as instruction
      if (!request.topicName) {
        throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND');
      }
      return this.generateDeepLinkTopic(userId, request.topicName, callbacks);
    }

    // Ensure learning resources are present
    const existingResources = (topic.learningResources as { title: string; url: string }[]) ?? [];
    if (existingResources.length === 0) {
      await this.fetchLearningResources(topic);
      // Re-fetch updated topic to get resources in the stream
      topic = await this.topicRepository.findById(topic.id) ?? topic;
    } else {
      this.triggerLearningResourcesRefreshIfNeeded(topic);
    }

    await this.streamCachedTopic(topic.id, this.toFlatTopicContent(topic), callbacks);
  }

  /**
   * Generates a new topic via LLM for a specific named topic (unresolved deep link).
   * Mirrors the surprise/guided generation flow but instructs the LLM on which topic to write.
   * Ownership is still deferred until an explicit preview action.
   */
  private async generateDeepLinkTopic(
    userId: string,
    topicName: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const [alreadyDiscovered, dismissed] = await Promise.all([
      this.topicRepository.getDiscoveredTopicNames(userId),
      this.topicRepository.getDismissedTopicNames(userId),
    ]);

    let accumulatedText = '';

    await llmService.generateTopicStream(
      {
        mode: 'deep_link',
        topicName,
        alreadyDiscovered,
        dismissed,
      },
      {
        onChunk: (text) => {
          accumulatedText += text;
          callbacks.onChunk(text);
        },
        onComplete: () => {},
      }
    );

    const parsed = this.extractJson(accumulatedText);
    const validated = FlatTopicContentSchema.parse(parsed);

    const topic = await this.persistGeneratedTopic(validated, validated.name);

    const resources = await this.fetchLearningResources(topic);
    if (resources.length > 0) {
      callbacks.onLearningResources(resources);
    }

    callbacks.onMeta({ topicId: topic.id, cached: false });
    callbacks.onComplete();
  }

  /**
   * Returns insights for a topic. Status mapping:
   * - 'ready'                                  => return stored relationships
   * - 'processing' + not stale                 => { status: 'processing', groups: [] }
   * - null (pre-feature topic) or stale        => run sync LLM generation; return 'ready' or 'failed'
   */
  async getInsights(userId: string, topicId: string): Promise<InsightsResponse> {
    const topic = await this.topicRepository.findById(topicId);
    if (!topic) {
      throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND');
    }

    const INSIGHT_HEADING: Record<string, string> = {
      PREREQUISITE_OF: 'Prerequisites',
      BUILDS_ON: 'Helpful Background',
      PART_OF: 'Part Of',
      TYPE_OF: 'Type Of',
      EXAMPLE_OF: 'Example Of',
      IMPLEMENTS: 'Implements',
      CAUSES: 'Leads To',
      USED_WITH: 'Used With',
      ALTERNATIVE_TO: 'Alternatives',
      SIMILAR_TO: 'Similar Topics',
      TRADEOFF_WITH: 'Tradeoffs',
    };

    const GROUP_ORDER = [
      'PREREQUISITE_OF',
      'BUILDS_ON',
      'PART_OF',
      'TYPE_OF',
      'EXAMPLE_OF',
      'IMPLEMENTS',
      'CAUSES',
      'USED_WITH',
      'ALTERNATIVE_TO',
      'SIMILAR_TO',
      'TRADEOFF_WITH',
    ];

    const buildGroups = (rows: Awaited<ReturnType<TopicRepository['findInsights']>>): InsightGroup[] => {
      const byKind = new Map<string, typeof rows>();
      for (const row of rows) {
        const existing = byKind.get(row.relationKind) ?? [];
        existing.push(row);
        byKind.set(row.relationKind, existing);
      }
      return GROUP_ORDER
        .filter((kind) => byKind.has(kind))
        .map((kind) => ({
          relationKind: kind,
          heading: INSIGHT_HEADING[kind] ?? kind,
          items: (byKind.get(kind) ?? []).map((r) => ({
            targetName: r.targetName,
            targetTopicId: r.targetTopicId,
            owned: r.owned,
          })),
        }));
    };

    if (topic.insightsStatus === 'ready') {
      const rows = await this.topicRepository.findInsights(topicId, userId);
      return { topicId, status: 'ready', groups: buildGroups(rows) };
    }

    // processing, failed, or null — return current status; caller uses triggerInsights to start generation
    const status = (topic.insightsStatus as InsightsResponse['status']) ?? 'processing';
    return { topicId, status, groups: [] };
  }

  /**
   * Trigger insight generation for a topic. Idempotent — returns 'processing'
   * immediately if already in flight. Sets insightsStatus = 'processing' and
   * fires runInsightGenerationAsync (fire-and-forget). The caller should open
   * the GET /topics/:id/events SSE connection to receive the completion push.
   */
  async triggerInsights(topicId: string): Promise<InsightsResponse> {
    const topic = await this.topicRepository.findById(topicId);
    if (!topic) {
      throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND');
    }

    if (topic.insightsStatus === 'processing') {
      return { topicId, status: 'processing', groups: [] };
    }

    await this.topicRepository.setProcessingStatus(topicId, {
      insightsStatus: 'processing',
      insightsStartedAt: new Date(),
    });

    void this.runInsightGenerationAsync(topic);

    return { topicId, status: 'processing', groups: [] };
  }

  /**
   * Fire-and-forget: extract [[marker]] references from LLM content and persist
   * as hyperlink relationships. Each target name is run through the entity
   * resolver in a single batch, with one judge LLM call covering all
   * borderline candidates. Sets hyperlinksStatus = 'ready' on completion,
   * 'failed' on any unhandled error.
   */
  private async runHyperlinkExtractionAsync(
    topicId: string,
    content: FlatTopicContent
  ): Promise<void> {
    try {
      const mentionedNames = extractMentionedTopics(content, content.name);

      // Batch-embed all target names in a single API call (used both as the
      // relationship's `target_name_embedding` and as the resolver's candidate
      // embedding, so embedding cost is amortized).
      let targetEmbeddings: number[][] | null = null;
      try {
        targetEmbeddings = mentionedNames.length > 0
          ? await embeddingService.embedTexts(mentionedNames)
          : [];
      } catch {
        // Proceed without embeddings — resolver degrades to Tier 0 only
      }

      const inputs: ResolveInput[] = mentionedNames.map((name, i) => ({
        candidateName: name,
        candidateEmbedding: targetEmbeddings?.[i] ?? null,
        aliasSource: 'hyperlink_marker',
        contextHint: { sourceName: content.name, sourceCategory: content.category },
      }));

      const outcomes = await this.resolver.resolveBatch(inputs);

      const rows = mentionedNames.map((name, i) => {
        const outcome = outcomes[i];
        const resolved = outcome && !outcome.isNew;
        return {
          sourceTopicId: topicId,
          targetTopicId: resolved ? outcome.topicId : null,
          targetName: name,
          targetNameEmbedding: targetEmbeddings?.[i] ?? null,
          kind: 'hyperlink' as const,
          relationKind: null as string | null,
          createdAt: new Date(),
          resolvedAt: resolved ? new Date() : null,
        };
      });

      await this.topicRepository.insertRelationships(rows);
      await this.topicRepository.setProcessingStatus(topicId, { hyperlinksStatus: 'ready' });
    } catch {
      await this.topicRepository.setProcessingStatus(topicId, { hyperlinksStatus: 'failed' });
    }
  }

  /**
   * Trigger hyperlink extraction for a topic. Idempotent — returns 'processing'
   * immediately if already in flight. Sets hyperlinksStatus = 'processing' and
   * fires runHyperlinkExtractionAsync (fire-and-forget). The caller should open
   * the GET /topics/:id/events SSE connection to receive the completion push.
   */
  async triggerHyperlinks(topicId: string): Promise<HyperlinksResponse> {
    const topic = await this.topicRepository.findById(topicId);
    if (!topic) {
      throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND');
    }

    if (topic.hyperlinksStatus === 'processing') {
      return { topicId, status: 'processing' };
    }

    await this.topicRepository.setProcessingStatus(topicId, {
      hyperlinksStatus: 'processing',
      hyperlinksStartedAt: new Date(),
    });

    void this.runHyperlinkExtractionAsync(topicId, this.toFlatTopicContent(topic));

    return { topicId, status: 'processing' };
  }

  /**
   * Core insight generation + persistence logic. Throws on any failure.
   * Callers are responsible for error handling.
   */
  private async generateAndPersistInsights(
    topic: typeof topics.$inferSelect
  ): Promise<void> {
    const pros = (topic.contentPros as string[]) ?? [];
    const result = await llmService.generateInsights({
      name: topic.name,
      topicType: topic.topicType as import('../llm/llm.schemas.js').TopicType,
      category: topic.category,
      subcategory: topic.subcategory,
      content: {
        what: topic.contentWhat,
        why: topic.contentWhy,
        pros,
        cons: (topic.contentCons as string[]) ?? [],
        compareToSimilar: (topic.contentCompareToSimilar as { topic: string; comparison: string }[]) ?? [],
      },
    });

    const targetNames = result.groups.map((item) => item.targetName);

    // Batch-embed all target names (reused as resolver embedding + relationship column)
    let targetEmbeddings: number[][] | null = null;
    try {
      targetEmbeddings = targetNames.length > 0
        ? await embeddingService.embedTexts(targetNames)
        : [];
    } catch {
      // Proceed without embeddings — resolver degrades to Tier 0 only
    }

    const inputs: ResolveInput[] = targetNames.map((name, i) => ({
      candidateName: name,
      candidateEmbedding: targetEmbeddings?.[i] ?? null,
      aliasSource: 'insight_target',
      contextHint: { sourceName: topic.name, sourceCategory: topic.category },
    }));

    const outcomes = await this.resolver.resolveBatch(inputs);

    const rows = result.groups.map((item, i) => {
      const outcome = outcomes[i];
      const resolved = outcome && !outcome.isNew;
      return {
        sourceTopicId: topic.id,
        targetTopicId: resolved ? outcome.topicId : null,
        targetName: item.targetName,
        targetNameEmbedding: targetEmbeddings?.[i] ?? null,
        kind: 'insight' as const,
        relationKind: item.relationKind,
        createdAt: new Date(),
        resolvedAt: resolved ? new Date() : null,
      };
    });

    await this.topicRepository.insertRelationships(rows);
    await this.topicRepository.setProcessingStatus(topic.id, { insightsStatus: 'ready' });
  }

  /**
   * Fire-and-forget: call LLM to generate semantic insight relationships and
   * persist them. Sets insightsStatus = 'ready' on completion.
   */
  private async runInsightGenerationAsync(
    topic: typeof topics.$inferSelect
  ): Promise<void> {
    try {
      await this.generateAndPersistInsights(topic);
    } catch {
      await this.topicRepository.setProcessingStatus(topic.id, { insightsStatus: 'failed' });
    }
  }
}
