import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Custom type for pgvector: serialises number[] ↔ Postgres '[x,y,z]' string
const vector = customType<{ data: number[]; driverData: string; config: { dimensions: number } }>(
  {
    dataType(config) {
      return `vector(${config?.dimensions ?? 1536})`;
    },
    toDriver(value: number[]): string {
      return `[${value.join(',')}]`;
    },
    fromDriver(value: string): number[] {
      return value
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((s) => parseFloat(s.trim()));
    },
  }
);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  githubId: varchar('github_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique(),
  username: varchar('username', { length: 255 }).unique().notNull(),
  displayName: varchar('display_name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  githubIdIdx: index('idx_users_github_id').on(table.githubId),
  emailIdx: index('idx_users_email').on(table.email),
}));

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  revokedAt: timestamp('revoked_at'),
}, (table) => ({
  userIdIdx: index('idx_refresh_tokens_user_id').on(table.userId),
  tokenHashIdx: index('idx_refresh_tokens_token_hash').on(table.tokenHash),
}));

export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).unique().notNull(),
  topicType: varchar('topic_type', { length: 50 }).notNull(),
  category: varchar('category', { length: 255 }).notNull(),
  subcategory: varchar('subcategory', { length: 255 }).notNull(),
  contentWhat: text('content_what').notNull(),
  contentWhy: text('content_why').notNull(),
  contentPros: jsonb('content_pros').notNull(),
  contentCons: jsonb('content_cons').notNull(),
  contentCompareToSimilar: jsonb('content_compare_to_similar').notNull(),
  learningResources: jsonb('learning_resources').notNull().default(sql`'[]'::jsonb`),
  learningResourcesLastRefreshedAt: timestamp('learning_resources_last_refreshed_at'),
  hyperlinksStatus: varchar('hyperlinks_status', { length: 16 }),
  hyperlinksStartedAt: timestamp('hyperlinks_started_at'),
  insightsStatus: varchar('insights_status', { length: 16 }),
  insightsStartedAt: timestamp('insights_started_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  nameIdx: index('idx_topics_name').on(table.name),
  categoryIdx: index('idx_topics_category').on(table.category),
}));

export const userTopics = pgTable('user_topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('discovered'),
  discoveryMethod: varchar('discovery_method', { length: 20 }).notNull(),
  discoveredAt: timestamp('discovered_at').notNull(),
  learnedAt: timestamp('learned_at'),
}, (table) => ({
  userTopicUnique: uniqueIndex('idx_user_topics_unique').on(table.userId, table.topicId),
  userIdIdx: index('idx_user_topics_user_id').on(table.userId),
  topicIdIdx: index('idx_user_topics_topic_id').on(table.topicId),
}));

export const quizzes = pgTable('quizzes', {
  id: uuid('id').defaultRandom().primaryKey(),
  questions: jsonb('questions').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const quizTopics = pgTable('quiz_topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
}, (table) => ({
  quizTopicUnique: uniqueIndex('idx_quiz_topics_unique').on(table.quizId, table.topicId),
  quizIdIdx: index('idx_quiz_topics_quiz_id').on(table.quizId),
  topicIdIdx: index('idx_quiz_topics_topic_id').on(table.topicId),
}));

export const userQuizzes = pgTable('user_quizzes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  passed: boolean('passed').notNull(),
  attemptedAt: timestamp('attempted_at').notNull(),
  completedAt: timestamp('completed_at').notNull(),
}, (table) => ({
  userIdIdx: index('idx_user_quizzes_user_id').on(table.userId),
  quizIdIdx: index('idx_user_quizzes_quiz_id').on(table.quizId),
}));

export const topicRelationships = pgTable('topic_relationships', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceTopicId: uuid('source_topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  targetTopicId: uuid('target_topic_id').references(() => topics.id, { onDelete: 'set null' }),
  targetName: varchar('target_name', { length: 255 }).notNull(),
  kind: varchar('kind', { length: 16 }).notNull(),
  relationKind: varchar('relation_kind', { length: 32 }),
  createdAt: timestamp('created_at').defaultNow(),
  resolvedAt: timestamp('resolved_at'),
  targetNameEmbedding: vector('target_name_embedding', { dimensions: 1536 }),
}, (table) => ({
  sourceKindIdx: index('idx_topic_relationships_source_kind').on(table.sourceTopicId, table.kind),
}));

/**
 * Surface forms (aliases) associated with a topic. Every name a generator
 * (LLM) or user input has emitted for a topic is recorded here, with its own
 * embedding. The resolver searches this table — not topics.name_embedding —
 * so the alias set grows monotonically and previously-seen variants become
 * permanent match keys.
 */
export const topicAliases = pgTable('topic_aliases', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  aliasText: varchar('alias_text', { length: 255 }).notNull(),
  aliasTextLower: varchar('alias_text_lower', { length: 255 }).notNull(),
  aliasEmbedding: vector('alias_embedding', { dimensions: 1536 }),
  // 'name' | 'hyperlink_marker' | 'insight_target' | 'user_query'
  source: varchar('source', { length: 24 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  aliasUnique: uniqueIndex('idx_topic_aliases_topic_lower_unique').on(table.topicId, table.aliasTextLower),
  aliasLowerIdx: index('idx_topic_aliases_lower').on(table.aliasTextLower),
  topicIdx: index('idx_topic_aliases_topic').on(table.topicId),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;
export type UserTopic = typeof userTopics.$inferSelect;
export type NewUserTopic = typeof userTopics.$inferInsert;
export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;
export type QuizTopic = typeof quizTopics.$inferSelect;
export type NewQuizTopic = typeof quizTopics.$inferInsert;
export type UserQuiz = typeof userQuizzes.$inferSelect;
export type NewUserQuiz = typeof userQuizzes.$inferInsert;
export type TopicRelationship = typeof topicRelationships.$inferSelect;
export type NewTopicRelationship = typeof topicRelationships.$inferInsert;
export type TopicAlias = typeof topicAliases.$inferSelect;
export type NewTopicAlias = typeof topicAliases.$inferInsert;
