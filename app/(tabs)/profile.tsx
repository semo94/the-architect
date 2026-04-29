import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { AppBrandHeader } from '@/components/layout/AppBrandHeader';
import { AppearanceSection } from '@/components/profile/AppearanceSection';
import { BreadthExpansionStats } from '@/components/profile/BreadthExpansionStats';
import { CategoryBreakdownList } from '@/components/profile/CategoryBreakdownList';
import { LogoutButton } from '@/components/profile/LogoutButton';
import { MilestonesList } from '@/components/profile/MilestonesList';
import { QuizPerformanceCard } from '@/components/profile/QuizPerformanceCard';
import { UserProfileHeader } from '@/components/profile/UserProfileHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { profile, fetchStats, isStatsLoading } = useAppStore();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles, spacing } = useTheme();
  const { user, isAuthenticated } = useAuth();

  useFocusEffect(
    useCallback(() => {
      void fetchStats();
    }, [fetchStats])
  );

  return (
    <ScrollView style={themeStyles.container}>
      <AppBrandHeader paddingTop={Math.max(insets.top, 20)} />

      {isAuthenticated && user && <UserProfileHeader user={user} />}

      {isStatsLoading ? (
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
          <SkeletonLoader height={120} borderRadius={8} />
          <SkeletonLoader height={100} borderRadius={8} />
          <SkeletonLoader height={80} borderRadius={8} />
          <SkeletonLoader height={160} borderRadius={8} />
        </View>
      ) : (
        <>
          <BreadthExpansionStats
            totalTopics={profile.statistics.breadthExpansion.totalTopics}
            totalLearned={profile.statistics.breadthExpansion.totalLearned}
            inBucketList={profile.statistics.breadthExpansion.inBucketList}
            learningRate={profile.statistics.breadthExpansion.learningRate}
          />

          <QuizPerformanceCard
            totalQuizzesTaken={profile.statistics.quizPerformance.totalQuizzesTaken}
            averageScore={profile.statistics.quizPerformance.averageScore}
            passRate={profile.statistics.quizPerformance.passRate}
          />

          <CategoryBreakdownList
            categoryBreakdown={profile.statistics.categoryBreakdown}
          />

          <MilestonesList milestones={profile.milestones} />
        </>
      )}

      <AppearanceSection />

      <LogoutButton />
    </ScrollView>
  );
}