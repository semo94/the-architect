import { BreadthExpansionStats } from '@/components/profile/BreadthExpansionStats';
import { CategoryBreakdownList } from '@/components/profile/CategoryBreakdownList';
import { DiscoveredTechnologiesList } from '@/components/profile/DiscoveredTechnologiesList';
import { MilestonesList } from '@/components/profile/MilestonesList';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { QuizPerformanceCard } from '@/components/profile/QuizPerformanceCard';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { profile, technologies, deleteTechnology } = useAppStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles } = useTheme();

  const handleViewTechnology = (technologyId: string) => {
    router.push({
      pathname: '/technology-detail',
      params: { technologyId }
    });
  };

  const handleTestKnowledge = (technologyId: string) => {
    router.push({
      pathname: '/quiz',
      params: { technologyId }
    });
  };

  const handleDelete = (technologyId: string) => {
    const technology = technologies.find(t => t.id === technologyId);
    if (!technology) return;

    Alert.alert(
      'Delete Technology',
      `Are you sure you want to delete "${technology.name}"? This will permanently remove the technology and all associated quiz data from your profile.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTechnology(technologyId)
        }
      ]
    );
  };

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

      <DiscoveredTechnologiesList
        technologies={technologies}
        onTestKnowledge={handleTestKnowledge}
        onDelete={handleDelete}
        onTechnologyPress={handleViewTechnology}
      />
    </ScrollView>
  );
}