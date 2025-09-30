export type TechnologyStatus = 'discovered' | 'learned';
export type DiscoveryMethod = 'surprise' | 'guided';

export interface Technology {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  content: {
    what: string;
    why: string;
    pros: string[];
    cons: string[];
    compareToSimilar: {
      technology: string;
      comparison: string;
    }[];
  };
  status: TechnologyStatus;
  discoveryMethod: DiscoveryMethod;
  discoveredAt: string;
  learnedAt: string | null;
}

export interface Quiz {
  id: string;
  technologyId: string;
  technologyName: string;
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
    technologiesThisWeek: number;
    technologiesThisMonth: number;
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