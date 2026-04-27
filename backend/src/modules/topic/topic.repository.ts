import { and, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '../shared/database/client.js';
import {
  type NewTopic,
  type NewTopicRelationship,
  type NewUserTopic,
  type Topic,
  topicRelationships,
  topics,
  type UserTopic,
  userTopics,
} from '../shared/database/schema.js';
import type { DiscoverTopicRequest, ListTopicsQuery } from './topic.schemas.js';

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
    const result = await db.select().from(topics).where(eq(topics.name, name));
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

  /**
   * Two-tier fuzzy name lookup.
   * Tier 1: exact case-insensitive match.
   * Tier 2: trigram similarity >= FUZZY_MATCH_THRESHOLD.
   * Input is normalised (trim + collapse internal whitespace) before matching.
   */
  async findByNameFuzzy(name: string): Promise<Topic | undefined> {
    const normalised = name.trim().replace(/\s+/g, ' ');

    // Tier 1 — exact case-insensitive
    const exact = await db
      .select()
      .from(topics)
      .where(sql`LOWER(${topics.name}) = LOWER(${normalised})`)
      .limit(1);

    if (exact.length > 0) return exact[0];

    // Tier 2 — trigram similarity
    const fuzzy = await db
      .select()
      .from(topics)
      .where(sql`similarity(LOWER(${topics.name}), LOWER(${normalised})) >= ${FUZZY_MATCH_THRESHOLD}`)
      .orderBy(sql`similarity(LOWER(${topics.name}), LOWER(${normalised})) DESC`)
      .limit(1);

    return fuzzy[0];
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

  /**
   * Resolves previously unresolved topic_relationships rows that reference the
   * given topic name. Runs exact case-insensitive first, trigram fallback if
   * no rows were updated. Idempotent — the IS NULL guard prevents double-writes.
   */
  async reverseResolve(topicName: string, topicId: string): Promise<void> {
    // Tier 1 — exact case-insensitive
    const exact = await db.execute(sql`
      UPDATE topic_relationships
      SET target_topic_id = ${topicId},
          resolved_at = now()
      WHERE target_topic_id IS NULL
        AND LOWER(target_name) = LOWER(${topicName})
    `);

    if ((Array.isArray(exact) ? exact.length : ((exact as unknown as { rowCount?: number }).rowCount ?? 0)) > 0) return;

    // Tier 2 — trigram fallback
    await db.execute(sql`
      UPDATE topic_relationships
      SET target_topic_id = ${topicId},
          resolved_at = now()
      WHERE target_topic_id IS NULL
        AND similarity(LOWER(target_name), LOWER(${topicName})) >= ${FUZZY_MATCH_THRESHOLD}
    `);
  }
}

const FUZZY_MATCH_THRESHOLD = 0.45;
