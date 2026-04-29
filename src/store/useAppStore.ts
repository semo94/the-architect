import { authService, type User } from '@/services/authService';
import statsService from '@/services/statsService';
import topicService, { type TopicFilters } from '@/services/topicService';
import { create } from 'zustand';
import { Profile, Topic, TopicSummary } from '../types';

interface AppState {
  topics: TopicSummary[];
  topicDetails: Record<string, Topic>;
  profile: Profile;
  isLoading: boolean;
  error: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;
  /** Set to true by any flow that adds/updates topics outside the Topics tab (e.g. Discover flows). */
  topicsNeedRefresh: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  globalError: string | null;
  setProfile: (profile: Profile) => void;
  setTopics: (topics: TopicSummary[]) => void;
  setTopicDetail: (topic: Topic) => void;
  clearGlobalError: () => void;
  setTopicsNeedRefresh: (value: boolean) => void;
  removeTopicFromCache: (topicId: string) => void;
  fetchTopics: (filters?: TopicFilters, append?: boolean) => Promise<{ total: number; page: number; limit: number }>;
  isStatsLoading: boolean;
  fetchStats: () => Promise<void>;
  updateTopicStatusInCache: (topicId: string, status: 'discovered' | 'learned' | 'dismissed') => void;
  checkSession: (silent?: boolean) => Promise<void>;
  handleSessionExpired: () => void;
  logout: () => Promise<void>;
}

const initialProfile: Profile = {
  statistics: {
    breadthExpansion: {
      totalTopics: 0,
      totalLearned: 0,
      inBucketList: 0,
      learningRate: 0,
    },
    growthMetrics: {
      topicsThisWeek: 0,
      topicsThisMonth: 0,
      monthlyGrowthRate: '+0',
      averagePerWeek: 0,
    },
    discoveryStats: {
      surpriseMeCount: 0,
      guideMeCount: 0,
      dismissedCount: 0,
    },
    quizPerformance: {
      totalQuizzesTaken: 0,
      averageScore: 0,
      passRate: 0,
      firstTimePassRate: 0,
    },
    categoryBreakdown: {},
    activity: {
      currentStreak: 0,
      longestStreak: 0,
      lastDiscovery: '',
      totalDaysActive: 0,
      categoriesExplored: [],
    },
  },
  milestones: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useAppStore = create<AppState>()((set, get) => ({
  topics: [],
  topicDetails: {},
  profile: initialProfile,
  isLoading: false,
  error: null,
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,
  authError: null,
  globalError: null,
  topicsNeedRefresh: false,
  isStatsLoading: false,

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  setUser: (user: User | null) => set({ user, isAuthenticated: !!user, authError: null }),
  setAuthLoading: (isAuthLoading: boolean) => set({ isAuthLoading }),
  setAuthError: (authError: string | null) => set({ authError, isAuthLoading: false }),
  setProfile: (profile: Profile) => set({ profile }),
  setTopics: (topics: TopicSummary[]) => set({ topics }),
  setTopicDetail: (topic: Topic) => set((state) => ({ topicDetails: { ...state.topicDetails, [topic.id]: topic } })),
  clearGlobalError: () => set({ globalError: null }),
  setTopicsNeedRefresh: (value: boolean) => set({ topicsNeedRefresh: value }),
  removeTopicFromCache: (topicId: string) =>
    set((state) => ({ topics: state.topics.filter((t) => t.id !== topicId) })),

  fetchTopics: async (filters?: TopicFilters, append = false) => {
    const result = await topicService.getTopics(filters);

    set((state) => {
      if (!append) {
        return { topics: result.topics };
      }

      const existing = new Map(state.topics.map((topic) => [topic.id, topic]));
      for (const topic of result.topics) {
        existing.set(topic.id, topic);
      }

      return { topics: Array.from(existing.values()) };
    });

    return {
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  },

  fetchStats: async () => {
    set({ isStatsLoading: true });
    try {
      const stats = await statsService.getStats();
      set((state) => ({
        isStatsLoading: false,
        profile: {
          ...state.profile,
          statistics: stats.statistics,
          milestones: stats.milestones,
          updatedAt: new Date().toISOString(),
        },
      }));
    } catch {
      set({ isStatsLoading: false });
    }
  },

  updateTopicStatusInCache: (topicId: string, status: 'discovered' | 'learned' | 'dismissed') => {
    set((state) => {
      const learnedAt = status === 'learned' ? new Date().toISOString() : undefined;

      const updatedTopics = state.topics.map((topic) =>
        topic.id === topicId
          ? { ...topic, status, learnedAt: learnedAt ?? topic.learnedAt }
          : topic
      );

      const cachedDetail = state.topicDetails[topicId];
      const updatedDetails = cachedDetail
        ? {
            ...state.topicDetails,
            [topicId]: { ...cachedDetail, status, learnedAt: learnedAt ?? cachedDetail.learnedAt },
          }
        : state.topicDetails;

      return { topics: updatedTopics, topicDetails: updatedDetails };
    });
  },

  checkSession: async (silent = false) => {
    if (silent && get().isAuthLoading) {
      return;
    }

    try {
      if (!silent) {
        set({ isAuthLoading: true, authError: null });
      }

      const isValid = await authService.checkSession();
      if (isValid) {
        const user = await authService.getCurrentUser();
        set({ user, isAuthenticated: true, isAuthLoading: false });
        return;
      }

      if (await authService.hasRefreshToken()) {
        try {
          await authService.refreshAccessToken();
          const user = await authService.getCurrentUser();
          set({ user, isAuthenticated: true, isAuthLoading: false });
          return;
        } catch {
          // Ignore refresh errors and continue to unauthenticated state.
        }
      }

      set({ user: null, isAuthenticated: false, isAuthLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isAuthLoading: false });
    }
  },

  handleSessionExpired: () => {
    set({
      user: null,
      isAuthenticated: false,
      isAuthLoading: false,
      authError: null,
      topics: [],
      profile: initialProfile,
    });
  },

  logout: async () => {
    try {
      set({ isAuthLoading: true });
      await authService.logout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isAuthLoading: false,
        authError: null,
        topics: [],
        profile: initialProfile,
      });
    }
  },
}));

authService.onSessionExpired(() => {
  useAppStore.getState().handleSessionExpired();
});
