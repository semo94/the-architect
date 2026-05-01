import { and, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '../shared/database/client.js';
import {
  type NewTopic,
  type NewTopicAlias,
  type NewTopicRelationship,
  type NewUserTopic,
  type Topic,
  topicAliases,
  topicRelationships,
  topics,
  type UserTopic,
  userTopics,
} from '../shared/database/schema.js';
import type { DiscoverTopicRequest, ListTopicsQuery } from './topic.schemas.js';

/** Surface form types used as `topic_aliases.source`. */
export type TopicAliasSource = 'name' | 'hyperlink_marker' | 'insight_target' | 'user_query';

/** A neighbor row returned by alias-vector ANN search. */
export interface AliasNeighborRow {
  topicId: string;
  primaryName: string;
  aliasText: string;
  score: number;
}

export interface TopicWithUserState {
  topic: Topic;
  userTopic: UserTopic;
}

export interface TopicFacetRow {
  category: string;
  subcategory: string;
  count: number;
}

export class TopicRepository {
  async findById(id: string): Promise<Topic | undefined> {
    const result = await db.select().from(topics).where(eq(topics.id, id));
    return result[0];
  }

  async findByName(name: string): Promise<Topic | undefined> {
    const result = await db
      .select()
      .from(topics)
      .where(sql`LOWER(${topics.name}) = LOWER(${name})`)
      .limit(1);
    return result[0];
  }

  async create(data: NewTopic): Promise<Topic> {
    const result = await db.insert(topics).values(data).returning();
    return result[0];
  }

  async findUserTopic(userId: string, topicId: string): Promise<UserTopic | undefined> {
    const result = await db
      .select()
      .from(userTopics)
      .where(and(eq(userTopics.userId, userId), eq(userTopics.topicId, topicId)));
    return result[0];
  }

  async findUserTopics(
    userId: string,
    filters: ListTopicsQuery
  ): Promise<{ topics: TopicWithUserState[]; total: number }> {
    const conditions = [eq(userTopics.userId, userId)];

    if (filters.status !== 'all') {
      conditions.push(eq(userTopics.status, filters.status));
    }

    if (filters.category) {
      conditions.push(eq(topics.category, filters.category));
    }

    if (filters.subcategory) {
      conditions.push(eq(topics.subcategory, filters.subcategory));
    }

    if (filters.topicType) {
      conditions.push(eq(topics.topicType, filters.topicType));
    }

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(topics.name, searchTerm),
          ilike(topics.category, searchTerm),
          ilike(topics.subcategory, searchTerm)
        )!
      );
    }

    const whereClause = and(...conditions);
    const offset = (filters.page - 1) * filters.limit;

    const [rows, totalRows] = await Promise.all([
      db
        .select({ topic: topics, userTopic: userTopics })
        .from(userTopics)
        .innerJoin(topics, eq(userTopics.topicId, topics.id))
        .where(whereClause)
        .orderBy(desc(userTopics.discoveredAt))
        .limit(filters.limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(userTopics)
        .innerJoin(topics, eq(userTopics.topicId, topics.id))
        .where(whereClause),
    ]);

    return {
      topics: rows,
      total: Number(totalRows[0]?.total ?? 0),
    };
  }

  async createUserTopic(data: NewUserTopic): Promise<UserTopic> {
    const result = await db.insert(userTopics).values(data).returning();
    return result[0];
  }

  async updateUserTopicStatus(
    userId: string,
    topicId: string,
    status: 'discovered' | 'dismissed' | 'learned',
    learnedAt?: Date
  ): Promise<UserTopic | undefined> {
    const result = await db
      .update(userTopics)
      .set({
        status,
        learnedAt: status === 'learned' ? (learnedAt ?? new Date()) : null,
      })
      .where(and(eq(userTopics.userId, userId), eq(userTopics.topicId, topicId)))
      .returning();

    return result[0];
  }

  async deleteUserTopic(userId: string, topicId: string): Promise<void> {
    await db.delete(userTopics).where(and(eq(userTopics.userId, userId), eq(userTopics.topicId, topicId)));
  }

  async updateLearningResources(topicId: string, resources: { title: string; url: string }[]): Promise<void> {
    await db
      .update(topics)
      .set({
        learningResources: resources,
        learningResourcesLastRefreshedAt: new Date(),
      })
      .where(eq(topics.id, topicId));
  }

  async getDiscoveredTopicNames(userId: string): Promise<string[]> {
    const rows = await db
      .select({ name: topics.name })
      .from(userTopics)
      .innerJoin(topics, eq(userTopics.topicId, topics.id))
      .where(
        and(
          eq(userTopics.userId, userId),
          or(eq(userTopics.status, 'discovered'), eq(userTopics.status, 'learned'))!
        )
      );

    return rows.map((row) => row.name);
  }

  async getDismissedTopicNames(userId: string): Promise<string[]> {
    const rows = await db
      .select({ name: topics.name })
      .from(userTopics)
      .innerJoin(topics, eq(userTopics.topicId, topics.id))
      .where(and(eq(userTopics.userId, userId), eq(userTopics.status, 'dismissed')));

    return rows.map((row) => row.name);
  }

  async findUnservedTopicForUser(
    userId: string,
    request: DiscoverTopicRequest
  ): Promise<Topic | undefined> {
    const filters = [
      isNull(userTopics.id),
    ];

    if (request.mode === 'guided' && request.constraints) {
      filters.push(eq(topics.category, request.constraints.category));
      filters.push(eq(topics.subcategory, request.constraints.subcategory));
      filters.push(eq(topics.topicType, request.constraints.topicType));
    }

    const rows = await db
      .select({ topic: topics })
      .from(topics)
      .leftJoin(
        userTopics,
        and(eq(userTopics.topicId, topics.id), eq(userTopics.userId, userId))
      )
      .where(and(...filters))
      .orderBy(sql`random()`)
      .limit(1);

    return rows[0]?.topic;
  }

  async getUserTopicFacetRows(userId: string): Promise<TopicFacetRow[]> {
    const rows = await db
      .select({
        category: topics.category,
        subcategory: topics.subcategory,
        total: count(),
      })
      .from(userTopics)
      .innerJoin(topics, eq(userTopics.topicId, topics.id))
      .where(eq(userTopics.userId, userId))
      .groupBy(topics.category, topics.subcategory);

    return rows.map((row) => ({
      category: row.category,
      subcategory: row.subcategory,
      count: Number(row.total ?? 0),
    }));
  }

  // ---------------------------------------------------------------------------
  // Smart Navigation methods
  // ---------------------------------------------------------------------------

  /**
   * Upserts a topic by name. Uses ON CONFLICT DO NOTHING then falls back to a
   * SELECT to handle the race where two concurrent LLM completions attempt to
   * create the same topic simultaneously.
   */
  async upsertTopic(data: NewTopic): Promise<Topic> {
    const inserted = await db
      .insert(topics)
      .values(data)
      .onConflictDoNothing()
      .returning();

    if (inserted.length > 0) {
      return inserted[0];
    }

    // Another concurrent request won the insert race — fetch the existing row.
    const existing = await db.select().from(topics).where(eq(topics.name, data.name));
    return existing[0];
  }

  // ---------------------------------------------------------------------------
  // topic_aliases — entity resolution surface form table
  // ---------------------------------------------------------------------------

  /**
   * Tier-0 alias lookup: case-insensitive exact match against any recorded
   * alias of any topic. Returns the matched topic id (and its primary name)
   * or undefined.
   */
  async findAliasExact(name: string): Promise<{ topicId: string; primaryName: string } | undefined> {
    const lower = name.trim().toLowerCase();
    if (lower.length === 0) return undefined;

    const rows = await db
      .select({ topicId: topicAliases.topicId, primaryName: topics.name })
      .from(topicAliases)
      .innerJoin(topics, eq(topics.id, topicAliases.topicId))
      .where(eq(topicAliases.aliasTextLower, lower))
      .limit(1);

    return rows[0];
  }

  /**
   * Tier-1 alias-vector ANN: cosine search over alias_embedding. Returns up
   * to `k` nearest aliases with their parent topic id, primary name, and
   * cosine similarity score (1 - distance).
   */
  async findAliasNeighbors(embedding: number[], k = 5): Promise<AliasNeighborRow[]> {
    const vecLiteral = `[${embedding.join(',')}]`;
    const raw = await db.execute<{
      topic_id: string;
      primary_name: string;
      alias_text: string;
      score: number;
    }>(sql`
      SELECT
        ta.topic_id        AS topic_id,
        t.name             AS primary_name,
        ta.alias_text      AS alias_text,
        1 - (ta.alias_embedding <=> ${vecLiteral}::vector) AS score
      FROM topic_aliases ta
      INNER JOIN topics t ON t.id = ta.topic_id
      WHERE ta.alias_embedding IS NOT NULL
      ORDER BY ta.alias_embedding <=> ${vecLiteral}::vector
      LIMIT ${k}
    `);

    type Row = { topic_id: string; primary_name: string; alias_text: string; score: number };
    const rows: Row[] = Array.isArray(raw) ? raw : (raw as unknown as { rows: Row[] }).rows;
    return rows.map((r) => ({
      topicId: r.topic_id,
      primaryName: r.primary_name,
      aliasText: r.alias_text,
      score: Number(r.score),
    }));
  }

  /**
   * Returns up to `limit` aliases for the given topic ids, grouped by topic.
   * Used by the resolver to feed the LLM judge with each candidate's known
   * surface forms.
   */
  async getAliasesForTopics(topicIds: string[], limit = 8): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (topicIds.length === 0) return result;

    const rows = await db
      .select({ topicId: topicAliases.topicId, aliasText: topicAliases.aliasText })
      .from(topicAliases)
      .where(inArray(topicAliases.topicId, topicIds));

    for (const row of rows) {
      const list = result.get(row.topicId) ?? [];
      if (list.length < limit) list.push(row.aliasText);
      result.set(row.topicId, list);
    }
    return result;
  }

  /**
   * Inserts a new alias row. Idempotent — duplicates (same topic + same
   * lowercased text) are silently skipped via the unique index.
   */
  async upsertAlias(data: NewTopicAlias): Promise<void> {
    await db.insert(topicAliases).values(data).onConflictDoNothing();
  }

  /**
   * Returns unresolved relationship rows (`target_topic_id IS NULL`) whose
   * `target_name_embedding` is within `>= threshold` cosine of the supplied
   * embedding. Used by the post-create reverse-resolution pass to scope the
   * judge call to plausible candidates only.
   */
  async findUnresolvedRelationshipsNear(
    embedding: number[],
    threshold: number,
    limit = 50
  ): Promise<Array<{ relationshipId: string; targetName: string; targetNameEmbedding: number[] | null; score: number }>> {
    const vecLiteral = `[${embedding.join(',')}]`;
    const raw = await db.execute<{
      id: string;
      target_name: string;
      target_name_embedding: string | null;
      score: number;
    }>(sql`
      SELECT
        tr.id                   AS id,
        tr.target_name          AS target_name,
        tr.target_name_embedding::text AS target_name_embedding,
        1 - (tr.target_name_embedding <=> ${vecLiteral}::vector) AS score
      FROM topic_relationships tr
      WHERE tr.target_topic_id IS NULL
        AND tr.target_name_embedding IS NOT NULL
        AND 1 - (tr.target_name_embedding <=> ${vecLiteral}::vector) >= ${threshold}
      ORDER BY tr.target_name_embedding <=> ${vecLiteral}::vector
      LIMIT ${limit}
    `);

    type Row = { id: string; target_name: string; target_name_embedding: string | null; score: number };
    const rows: Row[] = Array.isArray(raw) ? raw : (raw as unknown as { rows: Row[] }).rows;

    const parseVec = (s: string | null): number[] | null => {
      if (!s) return null;
      return s.replace(/^\[|\]$/g, '').split(',').map((v) => parseFloat(v.trim()));
    };

    return rows.map((r) => ({
      relationshipId: r.id,
      targetName: r.target_name,
      targetNameEmbedding: parseVec(r.target_name_embedding),
      score: Number(r.score),
    }));
  }

  /**
   * Returns IDs of unresolved relationship rows whose `target_name`
   * case-insensitively matches the given name. No embedding required.
   * Used by the Tier-0 reverse-resolution pass.
   */
  async findUnresolvedRelationshipsByExactName(name: string): Promise<string[]> {
    const lower = name.trim().toLowerCase();
    if (lower.length === 0) return [];
    const rows = await db
      .select({ id: topicRelationships.id })
      .from(topicRelationships)
      .where(and(
        isNull(topicRelationships.targetTopicId),
        sql`lower(${topicRelationships.targetName}) = ${lower}`
      ));
    return rows.map((r) => r.id);
  }

  /**
   * Bulk-resolves a set of relationship rows to a single topic id. Sets
   * `target_topic_id` and `resolved_at`. Idempotent — only updates rows that
   * are still unresolved.
   */
  async resolveRelationships(relationshipIds: string[], topicId: string): Promise<void> {
    if (relationshipIds.length === 0) return;
    await db
      .update(topicRelationships)
      .set({ targetTopicId: topicId, resolvedAt: new Date() })
      .where(and(
        isNull(topicRelationships.targetTopicId),
        inArray(topicRelationships.id, relationshipIds)
      ));
  }

  /**
   * Sets processing status and timestamp columns atomically on a topic row.
   * Only the fields explicitly provided are written.
   */
  async setProcessingStatus(
    topicId: string,
    fields: {
      hyperlinksStatus?: string;
      hyperlinksStartedAt?: Date;
      insightsStatus?: string;
      insightsStartedAt?: Date;
    }
  ): Promise<void> {
    await db.update(topics).set(fields).where(eq(topics.id, topicId));
  }

  /**
   * Batch-inserts topic_relationships rows. Duplicate rows are silently ignored
   * via ON CONFLICT DO NOTHING (deduplication enforced by partial unique indexes).
   */
  async insertRelationships(rows: NewTopicRelationship[]): Promise<void> {
    if (rows.length === 0) return;
    await db.insert(topicRelationships).values(rows).onConflictDoNothing();
  }

  /**
   * Returns all hyperlink relationships for a topic with ownership annotation.
   */
  async findHyperlinks(
    topicId: string,
    userId: string
  ): Promise<
    Array<{
      relationshipId: string;
      targetName: string;
      targetTopicId: string | null;
      owned: boolean;
    }>
  > {
    const rawHyperlinks = await db.execute<{
      relationship_id: string;
      target_name: string;
      target_topic_id: string | null;
      owned: boolean;
    }>(sql`
      SELECT
        tr.id            AS relationship_id,
        tr.target_name,
        tr.target_topic_id,
        CASE WHEN ut.user_id IS NOT NULL THEN true ELSE false END AS owned
      FROM topic_relationships tr
      LEFT JOIN user_topics ut
        ON ut.topic_id = tr.target_topic_id
        AND ut.user_id = ${userId}
      WHERE tr.source_topic_id = ${topicId}
        AND tr.kind = 'hyperlink'
    `);

    // Drizzle returns RowList (postgres.js, array) or NeonHttpQueryResult (neon-http, has .rows)
    type HyperlinkRow = { relationship_id: string; target_name: string; target_topic_id: string | null; owned: boolean };
    const hyperlinkRows: HyperlinkRow[] = Array.isArray(rawHyperlinks) ? rawHyperlinks : (rawHyperlinks as unknown as { rows: HyperlinkRow[] }).rows;

    return hyperlinkRows.map((r) => ({
      relationshipId: r.relationship_id,
      targetName: r.target_name,
      targetTopicId: r.target_topic_id,
      owned: r.owned,
    }));
  }

  /**
   * Returns insight relationships grouped by relation_kind with ownership annotation.
   */
  async findInsights(
    topicId: string,
    userId: string
  ): Promise<
    Array<{
      relationKind: string;
      targetName: string;
      targetTopicId: string | null;
      owned: boolean;
    }>
  > {
    const rawInsights = await db.execute<{
      relation_kind: string;
      target_name: string;
      target_topic_id: string | null;
      owned: boolean;
    }>(sql`
      SELECT
        tr.relation_kind,
        tr.target_name,
        tr.target_topic_id,
        CASE WHEN ut.user_id IS NOT NULL THEN true ELSE false END AS owned
      FROM topic_relationships tr
      LEFT JOIN user_topics ut
        ON ut.topic_id = tr.target_topic_id
        AND ut.user_id = ${userId}
      WHERE tr.source_topic_id = ${topicId}
        AND tr.kind = 'insight'
      ORDER BY tr.relation_kind, tr.target_name
    `);

    type InsightRow = { relation_kind: string; target_name: string; target_topic_id: string | null; owned: boolean };
    const insightRows: InsightRow[] = Array.isArray(rawInsights) ? rawInsights : (rawInsights as unknown as { rows: InsightRow[] }).rows;

    return insightRows.map((r) => ({
      relationKind: r.relation_kind,
      targetName: r.target_name,
      targetTopicId: r.target_topic_id,
      owned: r.owned,
    }));
  }

}
