export type TopicStatus = 'discovered' | 'learned' | 'dismissed';
export type DiscoveryMethod = 'surprise' | 'guided';

export type TopicType =
  | 'concepts'
  | 'patterns'
  | 'technologies'
  | 'strategies'
  | 'models'
  | 'frameworks'
  | 'protocols'
  | 'practices'
  | 'methodologies'
  | 'architectures';

export interface TopicContent {
  what: string;
  why: string;
  pros: string[];
  cons: string[];
  compareToSimilar: {
    topic: string;
    comparison: string;
  }[];
}

export interface Topic {
  id: string;
  name: string;
  topicType: TopicType;
  category: string;
  subcategory: string;
  content: TopicContent;
  status: TopicStatus;
  discoveryMethod: DiscoveryMethod;
  discoveredAt: string;
  learnedAt: string | null;
}

export interface Quiz {
  id: string;
  topicId: string;
  topicName: string;
  questions: QuizQuestion[];
  score: number;
  passed: boolean;
  attemptNumber: number;
  attemptedAt: string;
  completedAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  userAnswer?: number;
}

export interface ProfileStatistics {
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

export interface Milestone {
  type: 'discovered' | 'learned' | 'performance' | 'consistency' | 'exploration';
  threshold: number;
  title: string;
  icon: string;
  achievedAt: string | null;
}

export interface Profile {
  statistics: ProfileStatistics;
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
}