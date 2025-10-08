import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { BreadthExpansionStats } from '@/components/profile/BreadthExpansionStats';
import { QuizPerformanceCard } from '@/components/profile/QuizPerformanceCard';
import { CategoryBreakdownList } from '@/components/profile/CategoryBreakdownList';
import { MilestonesList } from '@/components/profile/MilestonesList';
import { DiscoveredTechnologiesList } from '@/components/profile/DiscoveredTechnologiesList';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProfileScreen() {
  const { profile, technologies } = useAppStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles } = useTheme();

  const handleTestKnowledge = (technologyId: string) => {
    router.push({
      pathname: '/quiz',
      params: { technologyId }
    });
  };

  const styles = StyleSheet.create({
    container: themeStyles.container,
  });

  return (
    <ScrollView style={styles.container}>
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

      <DiscoveredTechnologiesList
        technologies={technologies}
        onTestKnowledge={handleTestKnowledge}
      />
    </ScrollView>
  );
}