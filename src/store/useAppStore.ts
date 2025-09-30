import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Technology, Quiz, Profile } from '../types';

interface AppState {
  // Technologies
  technologies: Technology[];
  dismissedTechnologies: string[];

  // Quizzes
  quizzes: Quiz[];
  currentQuiz: Quiz | null;

  // Profile
  profile: Profile;

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      technologies: [],
      dismissedTechnologies: [],
      quizzes: [],
      currentQuiz: null,
      profile: initialProfile,
      isLoading: false,
      error: null,

      // Technology Actions
      addTechnology: (technology) => {
        set((state) => ({
          technologies: [...state.technologies, technology],
        }));
        get().calculateStatistics();
        get().checkMilestones();
      },

      updateTechnologyStatus: (id, status) => {
        set((state) => ({
          technologies: state.technologies.map((tech) =>
            tech.id === id
              ? { ...tech, status, learnedAt: new Date().toISOString() }
              : tech
          ),
        }));
        get().calculateStatistics();
        get().checkMilestones();
      },

      dismissTechnology: (name) => {
        set((state) => ({
          dismissedTechnologies: [...state.dismissedTechnologies, name],
        }));
      },

      // Quiz Actions
      addQuiz: (quiz) => {
        set((state) => ({
          quizzes: [...state.quizzes, quiz],
        }));
        if (quiz.passed) {
          get().updateTechnologyStatus(quiz.technologyId, 'learned');
        }
        get().calculateStatistics();
      },

      updateQuizAnswer: (questionIndex, answer) => {
        set((state) => ({
          currentQuiz: state.currentQuiz
            ? {
                ...state.currentQuiz,
                questions: state.currentQuiz.questions.map((q, idx) =>
                  idx === questionIndex ? { ...q, userAnswer: answer } : q
                ),
              }
            : null,
        }));
      },

      // Statistics Calculation
      calculateStatistics: () => {
        const technologies = get().technologies;
        const quizzes = get().quizzes;
        const dismissedCount = get().dismissedTechnologies.length;

        const learned = technologies.filter(t => t.status === 'learned').length;
        const discovered = technologies.length;
        const inBucketList = discovered - learned;

        // Calculate category breakdown
        const categoryBreakdown: Record<string, any> = {};
        technologies.forEach(tech => {
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

        // Calculate learning rates
        Object.keys(categoryBreakdown).forEach(category => {
          const cat = categoryBreakdown[category];
          cat.learningRate = cat.discovered > 0
            ? Math.round((cat.learned / cat.discovered) * 100)
            : 0;
        });

        // Calculate quiz performance
        const averageScore = quizzes.length > 0
          ? Math.round(quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length)
          : 0;
        const passRate = quizzes.length > 0
          ? Math.round((quizzes.filter(q => q.passed).length / quizzes.length) * 100)
          : 0;

        // Update profile statistics
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
                // These need date-based calculation logic
              },
              discoveryStats: {
                surpriseMeCount: technologies.filter(t => t.discoveryMethod === 'surprise').length,
                guideMeCount: technologies.filter(t => t.discoveryMethod === 'guided').length,
                dismissedCount: dismissedCount,
              },
              quizPerformance: {
                totalQuizzesTaken: quizzes.length,
                averageScore: averageScore,
                passRate: passRate,
                firstTimePassRate: 0, // Needs calculation based on attempt numbers
              },
              categoryBreakdown: categoryBreakdown,
              activity: {
                ...state.profile.statistics.activity,
                categoriesExplored: Array.from(new Set(technologies.map(t => t.category))),
              },
            },
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      // Milestone Checking
      checkMilestones: () => {
        const { technologies } = get();
        const learned = technologies.filter(t => t.status === 'learned').length;
        const discovered = technologies.length;

        // Define milestone thresholds
        const milestoneDefinitions = [
          { type: 'discovered' as const, threshold: 10, title: 'First 10 Discovered', icon: '🎯' },
          { type: 'discovered' as const, threshold: 25, title: 'Quarter Century', icon: '🎖️' },
          { type: 'discovered' as const, threshold: 50, title: 'Half Hundred', icon: '⭐' },
          { type: 'learned' as const, threshold: 10, title: '10 Technologies Mastered', icon: '✓' },
          { type: 'learned' as const, threshold: 25, title: '25 Technologies Mastered', icon: '✓✓' },
          { type: 'learned' as const, threshold: 50, title: '50 Technologies Mastered', icon: '🏆' },
        ];

        // Check and update milestones
        set((state) => ({
          profile: {
            ...state.profile,
            milestones: milestoneDefinitions.map(def => {
              const count = def.type === 'discovered' ? discovered : learned;
              const existing = state.profile.milestones.find(
                m => m.type === def.type && m.threshold === def.threshold
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

      // UI State Actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      resetCurrentQuiz: () => set({ currentQuiz: null }),
      setCurrentQuiz: (quiz) => set({ currentQuiz: quiz }),
    }),
    {
      name: 'architect-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);