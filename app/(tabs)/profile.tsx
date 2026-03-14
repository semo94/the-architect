import { BreadthExpansionStats } from '@/components/profile/BreadthExpansionStats';
import { CategoryBreakdownList } from '@/components/profile/CategoryBreakdownList';
import { LogoutButton } from '@/components/profile/LogoutButton';
import { MilestonesList } from '@/components/profile/MilestonesList';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { QuizPerformanceCard } from '@/components/profile/QuizPerformanceCard';
import { UserProfileHeader } from '@/components/profile/UserProfileHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import { useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { profile, fetchStats } = useAppStore();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles } = useTheme();
  const { user, isAuthenticated } = useAuth();

  useFocusEffect(
    useCallback(() => {
      void fetchStats();
    }, [fetchStats])
  );

  return (
    <ScrollView style={themeStyles.container}>
      <ProfileHeader paddingTop={Math.max(insets.top, 20)} />

      {isAuthenticated && user && <UserProfileHeader user={user} />}

      <BreadthExpansionStats
        totalDiscovered={profile.statistics.breadthExpansion.totalDiscovered}
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

      {isAuthenticated && <LogoutButton />}
    </ScrollView>
  );
}