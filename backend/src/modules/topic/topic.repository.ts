import { and, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '../shared/database/client.js';
import {
    type NewTopic,
    type NewUserTopic,
    type Topic,
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
}
