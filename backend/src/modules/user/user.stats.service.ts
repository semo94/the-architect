import { and, avg, count, eq, sql } from 'drizzle-orm';
import { db } from '../shared/database/client.js';
import { topics, userQuizzes, userTopics } from '../shared/database/schema.js';

interface ProfileStatistics {
  breadthExpansion: {
    totalDiscovered: number;
    totalLearned: number;
    inBucketList: number;
    learningRate: number;
  };
  growthMetrics: {
    topicsThisWeek: number;
    topicsThisMonth: number;
    monthlyGrowthRate: string;
    averagePerWeek: number;
  };
  discoveryStats: {
    surpriseMeCount: number;
    guideMeCount: number;
    dismissedCount: number;
  };
  quizPerformance: {
    totalQuizzesTaken: number;
    averageScore: number;
    passRate: number;
    firstTimePassRate: number;
  };
  categoryBreakdown: Record<string, {
    discovered: number;
    learned: number;
    learningRate: number;
  }>;
  activity: {
    currentStreak: number;
    longestStreak: number;
    lastDiscovery: string;
    totalDaysActive: number;
    categoriesExplored: string[];
  };
}

interface Milestone {
  type: 'discovered' | 'learned';
  threshold: number;
  title: string;
  icon: string;
  achievedAt: string | null;
}

export class UserStatsService {
  async getUserStats(userId: string): Promise<ProfileStatistics> {
    const [topicCounts, discoveryCounts, quizAgg, categoryRows] = await Promise.all([
      db
        .select({
          total: count(),
          learned: sql<number>`count(*) filter (where ${userTopics.status} = 'learned')`,
          discovered: sql<number>`count(*) filter (where ${userTopics.status} = 'discovered')`,
        })
        .from(userTopics)
        .where(and(eq(userTopics.userId, userId), sql`${userTopics.status} <> 'dismissed'`)),
      db
        .select({
          surprise: sql<number>`count(*) filter (where ${userTopics.discoveryMethod} = 'surprise')`,
          guided: sql<number>`count(*) filter (where ${userTopics.discoveryMethod} = 'guided')`,
          dismissed: sql<number>`count(*) filter (where ${userTopics.status} = 'dismissed')`,
        })
        .from(userTopics)
        .where(eq(userTopics.userId, userId)),
      db
        .select({
          total: count(),
          averageScore: avg(userQuizzes.score),
          passedCount: sql<number>`count(*) filter (where ${userQuizzes.passed} = true)`,
        })
        .from(userQuizzes)
        .where(eq(userQuizzes.userId, userId)),
      db
        .select({
          category: topics.category,
          discovered: count(),
          learned: sql<number>`count(*) filter (where ${userTopics.status} = 'learned')`,
        })
        .from(userTopics)
        .innerJoin(topics, eq(userTopics.topicId, topics.id))
        .where(and(eq(userTopics.userId, userId), sql`${userTopics.status} <> 'dismissed'`))
        .groupBy(topics.category),
    ]);

    const totalDiscovered = Number(topicCounts[0]?.total ?? 0);
    const totalLearned = Number(topicCounts[0]?.learned ?? 0);
    const inBucketList = Number(topicCounts[0]?.discovered ?? 0);

    const totalQuizzesTaken = Number(quizAgg[0]?.total ?? 0);
    const passedCount = Number(quizAgg[0]?.passedCount ?? 0);
    const averageScore = quizAgg[0]?.averageScore ? Math.round(Number(quizAgg[0].averageScore)) : 0;

    const categoryBreakdown = categoryRows.reduce((acc, row) => {
      const discovered = Number(row.discovered ?? 0);
      const learned = Number(row.learned ?? 0);
      acc[row.category] = {
        discovered,
        learned,
        learningRate: discovered > 0 ? Math.round((learned / discovered) * 100) : 0,
      };
      return acc;
    }, {} as Record<string, { discovered: number; learned: number; learningRate: number }>);

    return {
      breadthExpansion: {
        totalDiscovered,
        totalLearned,
        inBucketList,
        learningRate: totalDiscovered > 0 ? Math.round((totalLearned / totalDiscovered) * 100) : 0,
      },
      growthMetrics: {
        // Phase 1 placeholder fields; date-window growth metrics are intentionally deferred.
        topicsThisWeek: 0,
        topicsThisMonth: 0,
        monthlyGrowthRate: '+0',
        averagePerWeek: 0,
      },
      discoveryStats: {
        surpriseMeCount: Number(discoveryCounts[0]?.surprise ?? 0),
        guideMeCount: Number(discoveryCounts[0]?.guided ?? 0),
        dismissedCount: Number(discoveryCounts[0]?.dismissed ?? 0),
      },
      quizPerformance: {
        totalQuizzesTaken,
        averageScore,
        passRate: totalQuizzesTaken > 0 ? Math.round((passedCount / totalQuizzesTaken) * 100) : 0,
        // Phase 1 placeholder; first-attempt pass metric is deferred.
        firstTimePassRate: 0,
      },
      categoryBreakdown,
      activity: {
        // Phase 1 placeholders; streak/activity timeline fields are deferred.
        currentStreak: 0,
        longestStreak: 0,
        lastDiscovery: '',
        totalDaysActive: 0,
        categoriesExplored: Object.keys(categoryBreakdown),
      },
    };
  }

  async getMilestones(userId: string): Promise<Milestone[]> {
    const stats = await this.getUserStats(userId);

    const milestoneDefinitions: Array<Omit<Milestone, 'achievedAt'>> = [
      { type: 'discovered', threshold: 10, title: 'First 10 Discovered', icon: 'locate-outline' },
      { type: 'discovered', threshold: 25, title: 'Quarter Century', icon: 'medal-outline' },
      { type: 'discovered', threshold: 50, title: 'Half Hundred', icon: 'star-outline' },
      { type: 'learned', threshold: 10, title: '10 Topics Mastered', icon: 'checkmark-circle-outline' },
      { type: 'learned', threshold: 25, title: '25 Topics Mastered', icon: 'checkmark-done-circle-outline' },
      { type: 'learned', threshold: 50, title: '50 Topics Mastered', icon: 'trophy-outline' },
    ];

    return milestoneDefinitions.map((definition) => {
      const count = definition.type === 'discovered'
        ? stats.breadthExpansion.totalDiscovered
        : stats.breadthExpansion.totalLearned;

      return {
        ...definition,
        achievedAt: count >= definition.threshold ? new Date().toISOString() : null,
      };
    });
  }
}
