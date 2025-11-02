import { BreadthExpansionStats } from '@/components/profile/BreadthExpansionStats';
import { CategoryBreakdownList } from '@/components/profile/CategoryBreakdownList';
import { MilestonesList } from '@/components/profile/MilestonesList';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { QuizPerformanceCard } from '@/components/profile/QuizPerformanceCard';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import React from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { profile } = useAppStore();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles } = useTheme();

  return (
    <ScrollView style={themeStyles.container}>
      <ProfileHeader paddingTop={Math.max(insets.top, 20)} />

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
    </ScrollView>
  );
}