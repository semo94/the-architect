import AsyncStorage from '@react-native-async-storage/async-storage';
import { create, type StateCreator } from 'zustand';
import { Profile, Quiz, Topic } from '../types';
import type { User } from '@/services/authService';
import { authService } from '@/services/authService';

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

interface AppState {
  topics: Topic[];
  dismissedTopics: string[];
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  profile: Profile;
  isLoading: boolean;
  error: string | null;

  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;

  addTopic: (topic: Topic) => void;
  updateTopicStatus: (id: string, status: 'learned') => void;
  dismissTopic: (name: string) => void;
  deleteTopic: (id: string) => void;
  addQuiz: (quiz: Quiz) => void;
  updateQuizAnswer: (questionIndex: number, answer: number) => void;
  calculateStatistics: () => void;
  checkMilestones: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetCurrentQuiz: () => void;
  setCurrentQuiz: (quiz: Quiz | null) => void;

  // Auth actions
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const initialProfile: Profile = {
  statistics: {
    breadthExpansion: {
      totalDiscovered: 0,
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

const storeCreator: StateCreator<AppState> = (set, get) => ({
  topics: [],
  dismissedTopics: [],
  quizzes: [],
  currentQuiz: null,
  profile: initialProfile,
  isLoading: false,
  error: null,

  // Auth state initial values
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,
  authError: null,

  addTopic: (topic: Topic) => {
    set((state) => {
      // Prevent duplicates by id or name when navigating back to a previously rendered component
      const exists = state.topics.some(
        (t: Topic) => t.id === topic.id || t.name === topic.name
      );
      if (exists) {
        return state;
      }
      return {
        topics: [...state.topics, topic],
      } as any;
    });
    get().calculateStatistics();
    get().checkMilestones();
  },

  updateTopicStatus: (id: string, status: 'learned') => {
    set((state) => ({
      topics: state.topics.map((topic: Topic) =>
        topic.id === id
          ? { ...topic, status, learnedAt: new Date().toISOString() }
          : topic
      ),
    }));
    get().calculateStatistics();
    get().checkMilestones();
  },

  dismissTopic: (name: string) => {
    set((state) => ({
      dismissedTopics: [...state.dismissedTopics, name],
    }));
  },

  deleteTopic: (id: string) => {
    set((state) => ({
      topics: state.topics.filter((topic: Topic) => topic.id !== id),
      quizzes: state.quizzes.filter((quiz: Quiz) => quiz.topicId !== id),
    }));
    get().calculateStatistics();
    get().checkMilestones();
  },

  addQuiz: (quiz: Quiz) => {
    set((state) => ({
      quizzes: [...state.quizzes, quiz],
    }));
    if (quiz.passed) {
      get().updateTopicStatus(quiz.topicId, 'learned');
    }
    get().calculateStatistics();
  },

  updateQuizAnswer: (questionIndex: number, answer: number) => {
    set((state) => ({
      currentQuiz: state.currentQuiz
        ? {
            ...state.currentQuiz,
            questions: state.currentQuiz.questions.map((q: any, idx: number) =>
              idx === questionIndex ? { ...q, userAnswer: answer } : q
            ),
          }
        : null,
    }));
  },

  calculateStatistics: () => {
    const topics = get().topics;
    const quizzes = get().quizzes;
    const dismissedCount = get().dismissedTopics.length;

    const learned = topics.filter((t: Topic) => t.status === 'learned').length;
    const discovered = topics.length;
    const inBucketList = discovered - learned;

    const categoryBreakdown: Record<string, any> = {};
    topics.forEach((topic: Topic) => {
      if (!categoryBreakdown[topic.category]) {
        categoryBreakdown[topic.category] = {
          discovered: 0,
          learned: 0,
          learningRate: 0,
        };
      }
      categoryBreakdown[topic.category].discovered++;
      if (topic.status === 'learned') {
        categoryBreakdown[topic.category].learned++;
      }
    });

    Object.keys(categoryBreakdown).forEach((category) => {
      const cat = categoryBreakdown[category];
      cat.learningRate = cat.discovered > 0
        ? Math.round((cat.learned / cat.discovered) * 100)
        : 0;
    });

    const averageScore = quizzes.length > 0
      ? Math.round(quizzes.reduce((sum: number, q: Quiz) => sum + q.score, 0) / quizzes.length)
      : 0;
    const passRate = quizzes.length > 0
      ? Math.round((quizzes.filter((q: Quiz) => q.passed).length / quizzes.length) * 100)
      : 0;

    set((state) => ({
      profile: {
        ...state.profile,
        statistics: {
          breadthExpansion: {
            totalDiscovered: discovered,
            totalLearned: learned,
            inBucketList: inBucketList,
            learningRate: discovered > 0 ? Math.round((learned / discovered) * 100) : 0,
          },
          growthMetrics: {
            ...state.profile.statistics.growthMetrics,
          },
          discoveryStats: {
            surpriseMeCount: topics.filter((t: Topic) => t.discoveryMethod === 'surprise').length,
            guideMeCount: topics.filter((t: Topic) => t.discoveryMethod === 'guided').length,
            dismissedCount: dismissedCount,
          },
          quizPerformance: {
            totalQuizzesTaken: quizzes.length,
            averageScore: averageScore,
            passRate: passRate,
            firstTimePassRate: 0,
          },
          categoryBreakdown: categoryBreakdown,
          activity: {
            ...state.profile.statistics.activity,
            categoriesExplored: Array.from(new Set(topics.map((t: Topic) => t.category))),
          },
        },
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  checkMilestones: () => {
    const { topics } = get();
    const learned = topics.filter((t: Topic) => t.status === 'learned').length;
    const discovered = topics.length;

    const milestoneDefinitions = [
      { type: 'discovered' as const, threshold: 10, title: 'First 10 Discovered', icon: '🎯' },
      { type: 'discovered' as const, threshold: 25, title: 'Quarter Century', icon: '🎖️' },
      { type: 'discovered' as const, threshold: 50, title: 'Half Hundred', icon: '⭐' },
      { type: 'learned' as const, threshold: 10, title: '10 Topics Mastered', icon: '✓' },
      { type: 'learned' as const, threshold: 25, title: '25 Topics Mastered', icon: '✓✓' },
      { type: 'learned' as const, threshold: 50, title: '50 Topics Mastered', icon: '🏆' },
    ];

    set((state) => ({
      profile: {
        ...state.profile,
        milestones: milestoneDefinitions.map((def) => {
          const count = def.type === 'discovered' ? discovered : learned;
          const existing = state.profile.milestones.find(
            (m) => m.type === def.type && m.threshold === def.threshold
          );

          return {
            ...def,
            achievedAt: existing?.achievedAt ||
              (count >= def.threshold ? new Date().toISOString() : null),
          };
        }),
      },
    }));
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  resetCurrentQuiz: () => set({ currentQuiz: null }),
  setCurrentQuiz: (quiz: Quiz | null) => set({ currentQuiz: quiz }),

  // Auth actions
  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      authError: null,
    });
  },

  setAuthLoading: (loading) => {
    set({ isAuthLoading: loading });
  },

  setAuthError: (error) => {
    set({ authError: error, isAuthLoading: false });
  },

  checkSession: async () => {
    try {
      set({ isAuthLoading: true, authError: null });

      // First check stored user
      const storedUser = await authService.getStoredUser();

      if (storedUser) {
        // Validate session with backend
        const user = await authService.checkSession();

        if (user) {
          set({ user, isAuthenticated: true, isAuthLoading: false });
          return;
        }
      }

      // No valid session
      set({ user: null, isAuthenticated: false, isAuthLoading: false });
    } catch (error) {
      console.error('Session check failed:', error);
      set({
        user: null,
        isAuthenticated: false,
        isAuthLoading: false,
        authError: error instanceof Error ? error.message : 'Session check failed',
      });
    }
  },

  logout: async () => {
    try {
      set({ isAuthLoading: true });

      await authService.logout();

      // Clear auth state
      set({
        user: null,
        isAuthenticated: false,
        isAuthLoading: false,
        authError: null,
      });
    } catch (error) {
      console.error('Logout failed:', error);

      // Still clear local auth state even if backend call fails
      set({
        user: null,
        isAuthenticated: false,
        isAuthLoading: false,
        authError: error instanceof Error ? error.message : 'Logout failed',
      });
    }
  },
});

export const useAppStore = create<AppState>()(storeCreator);

// Minimal cross-platform persistence without zustand/middleware
const STORAGE_KEY = 'architect-app-storage';

type PersistedSlice = Pick<AppState,
  'topics' | 'dismissedTopics' | 'quizzes' | 'currentQuiz' | 'profile' | 'user'>;

function selectPersisted(state: AppState): PersistedSlice {
  return {
    topics: state.topics,
    dismissedTopics: state.dismissedTopics,
    quizzes: state.quizzes,
    currentQuiz: state.currentQuiz,
    profile: state.profile,
    user: state.user, // Persist user info (not tokens - they're in SecureStore)
  };
}

async function hydrateState() {
  try {
    if (isWeb) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedSlice>;
        useAppStore.setState((prev) => ({ ...prev, ...parsed }));
      }
    } else {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedSlice>;
        useAppStore.setState((prev) => ({ ...prev, ...parsed }));
      }
    }
  } catch {
    // ignore storage errors
  }
}

hydrateState();

useAppStore.subscribe(async (state) => {
  try {
    const toSave = JSON.stringify(selectPersisted(state));
    if (isWeb) {
      window.localStorage.setItem(STORAGE_KEY, toSave);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, toSave);
    }
  } catch {
    // ignore storage errors
  }
});


