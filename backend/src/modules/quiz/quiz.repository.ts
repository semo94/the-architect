import { and, count, eq, inArray, notExists, sql } from 'drizzle-orm';
import { db } from '../shared/database/client.js';
import {
    type NewQuiz,
    type NewUserQuiz,
    type Quiz,
    quizTopics,
    quizzes,
    type Topic,
    topics,
    userQuizzes,
} from '../shared/database/schema.js';

export interface UserQuizWithDetails {
  userQuizId: string;
  quizId: string;
  topicId: string;
  topicName: string;
  questions: unknown;
  score: number;
  passed: boolean;
  attemptedAt: Date;
  completedAt: Date;
}

export class QuizRepository {
  async create(data: NewQuiz): Promise<Quiz> {
    const result = await db.insert(quizzes).values(data).returning();
    return result[0];
  }

  async findById(id: string): Promise<Quiz | undefined> {
    const result = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return result[0];
  }

  async createQuizTopics(quizId: string, topicIds: string[]): Promise<void> {
    if (topicIds.length === 0) {
      return;
    }

    await db
      .insert(quizTopics)
      .values(topicIds.map((topicId) => ({ quizId, topicId })))
      .onConflictDoNothing();
  }

  async getTopicsForQuiz(quizId: string): Promise<Topic[]> {
    const rows = await db
      .select({ topic: topics })
      .from(quizTopics)
      .innerJoin(topics, eq(quizTopics.topicId, topics.id))
      .where(eq(quizTopics.quizId, quizId));

    return rows.map((row) => row.topic);
  }

  async createUserQuiz(data: NewUserQuiz) {
    const result = await db.insert(userQuizzes).values(data).returning();
    return result[0];
  }

  async getUserQuizzes(userId: string, topicId?: string): Promise<UserQuizWithDetails[]> {
    const conditions = [eq(userQuizzes.userId, userId)];

    if (topicId) {
      conditions.push(eq(quizTopics.topicId, topicId));
    }

    const rows = await db
      .select({
        userQuizId: userQuizzes.id,
        quizId: quizzes.id,
        topicId: topics.id,
        topicName: topics.name,
        questions: quizzes.questions,
        score: userQuizzes.score,
        passed: userQuizzes.passed,
        attemptedAt: userQuizzes.attemptedAt,
        completedAt: userQuizzes.completedAt,
      })
      .from(userQuizzes)
      .innerJoin(quizzes, eq(userQuizzes.quizId, quizzes.id))
      .innerJoin(quizTopics, eq(quizTopics.quizId, quizzes.id))
      .innerJoin(topics, eq(quizTopics.topicId, topics.id))
      .where(and(...conditions));

    return rows;
  }

  async countUserAttemptsForTopic(userId: string, topicId: string): Promise<number> {
    const rows = await db
      .select({ total: count() })
      .from(userQuizzes)
      .innerJoin(quizTopics, eq(quizTopics.quizId, userQuizzes.quizId))
      .where(and(eq(userQuizzes.userId, userId), eq(quizTopics.topicId, topicId)));

    return Number(rows[0]?.total ?? 0);
  }

  async findUnattemptedQuizForTopic(userId: string, topicId: string): Promise<Quiz | undefined> {
    const rows = await db
      .select({ quiz: quizzes })
      .from(quizzes)
      .innerJoin(quizTopics, eq(quizTopics.quizId, quizzes.id))
      .where(
        and(
          eq(quizTopics.topicId, topicId),
          notExists(
            db
              .select({ id: userQuizzes.id })
              .from(userQuizzes)
              .where(and(eq(userQuizzes.userId, userId), eq(userQuizzes.quizId, quizzes.id)))
          )
        )
      )
      .orderBy(sql`random()`)
      .limit(1);

    return rows[0]?.quiz;
  }

  async getTopicIdByQuizId(quizId: string): Promise<string | undefined> {
    const rows = await db
      .select({ topicId: quizTopics.topicId })
      .from(quizTopics)
      .where(eq(quizTopics.quizId, quizId))
      .limit(1);

    return rows[0]?.topicId;
  }

  async deleteUserQuizzesByTopic(userId: string, topicId: string): Promise<void> {
    const rows = await db
      .select({ quizId: quizTopics.quizId })
      .from(quizTopics)
      .where(eq(quizTopics.topicId, topicId));

    const quizIds = rows.map((row) => row.quizId);
    if (quizIds.length === 0) {
      return;
    }

    await db
      .delete(userQuizzes)
      .where(and(eq(userQuizzes.userId, userId), inArray(userQuizzes.quizId, quizIds)));
  }
}
