import AsyncStorage from '@react-native-async-storage/async-storage';
import { create, type StateCreator } from 'zustand';
import { Profile, Quiz, Technology } from '../types';

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

interface AppState {
  technologies: Technology[];
  dismissedTechnologies: string[];
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  profile: Profile;
  isLoading: boolean;
  error: string | null;
  addTechnology: (technology: Technology) => void;
  updateTechnologyStatus: (id: string, status: 'learned') => void;
  dismissTechnology: (name: string) => void;
  addQuiz: (quiz: Quiz) => void;
  updateQuizAnswer: (questionIndex: number, answer: number) => void;
  calculateStatistics: () => void;
  checkMilestones: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetCurrentQuiz: () => void;
  setCurrentQuiz: (quiz: Quiz | null) => void;
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
      technologiesThisWeek: 0,
      technologiesThisMonth: 0,
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
  technologies: [],
  dismissedTechnologies: [],
  quizzes: [],
  currentQuiz: null,
  profile: initialProfile,
  isLoading: false,
  error: null,

  addTechnology: (technology: Technology) => {
    set((state) => {
      // Prevent duplicates by id or name when navigating back to a previously rendered component
      const exists = state.technologies.some(
        (t: Technology) => t.id === technology.id || t.name === technology.name
      );
      if (exists) {
        return state;
      }
      return {
        technologies: [...state.technologies, technology],
      } as any;
    });
    get().calculateStatistics();
    get().checkMilestones();
  },

  updateTechnologyStatus: (id: string, status: 'learned') => {
    set((state) => ({
      technologies: state.technologies.map((tech: Technology) =>
        tech.id === id
          ? { ...tech, status, learnedAt: new Date().toISOString() }
          : tech
      ),
    }));
    get().calculateStatistics();
    get().checkMilestones();
  },

  dismissTechnology: (name: string) => {
    set((state) => ({
      dismissedTechnologies: [...state.dismissedTechnologies, name],
    }));
  },

  addQuiz: (quiz: Quiz) => {
    set((state) => ({
      quizzes: [...state.quizzes, quiz],
    }));
    if (quiz.passed) {
      get().updateTechnologyStatus(quiz.technologyId, 'learned');
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
    const technologies = get().technologies;
    const quizzes = get().quizzes;
    const dismissedCount = get().dismissedTechnologies.length;

    const learned = technologies.filter((t: Technology) => t.status === 'learned').length;
    const discovered = technologies.length;
    const inBucketList = discovered - learned;

    const categoryBreakdown: Record<string, any> = {};
    technologies.forEach((tech: Technology) => {
      if (!categoryBreakdown[tech.category]) {
        categoryBreakdown[tech.category] = {
          discovered: 0,
          learned: 0,
          learningRate: 0,
        };
      }
      categoryBreakdown[tech.category].discovered++;
      if (tech.status === 'learned') {
        categoryBreakdown[tech.category].learned++;
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
            surpriseMeCount: technologies.filter((t: Technology) => t.discoveryMethod === 'surprise').length,
            guideMeCount: technologies.filter((t: Technology) => t.discoveryMethod === 'guided').length,
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
            categoriesExplored: Array.from(new Set(technologies.map((t: Technology) => t.category))),
          },
        },
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  checkMilestones: () => {
    const { technologies } = get();
    const learned = technologies.filter((t: Technology) => t.status === 'learned').length;
    const discovered = technologies.length;

    const milestoneDefinitions = [
      { type: 'discovered' as const, threshold: 10, title: 'First 10 Discovered', icon: '🎯' },
      { type: 'discovered' as const, threshold: 25, title: 'Quarter Century', icon: '🎖️' },
      { type: 'discovered' as const, threshold: 50, title: 'Half Hundred', icon: '⭐' },
      { type: 'learned' as const, threshold: 10, title: '10 Technologies Mastered', icon: '✓' },
      { type: 'learned' as const, threshold: 25, title: '25 Technologies Mastered', icon: '✓✓' },
      { type: 'learned' as const, threshold: 50, title: '50 Technologies Mastered', icon: '🏆' },
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
});

export const useAppStore = create<AppState>()(storeCreator);

// Minimal cross-platform persistence without zustand/middleware
const STORAGE_KEY = 'architect-app-storage';

type PersistedSlice = Pick<AppState,
  'technologies' | 'dismissedTechnologies' | 'quizzes' | 'currentQuiz' | 'profile'>;

function selectPersisted(state: AppState): PersistedSlice {
  return {
    technologies: state.technologies,
    dismissedTechnologies: state.dismissedTechnologies,
    quizzes: state.quizzes,
    currentQuiz: state.currentQuiz,
    profile: state.profile,
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


