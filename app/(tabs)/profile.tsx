import { BreadthExpansionStats } from '@/components/profile/BreadthExpansionStats';
import { CategoryBreakdownList } from '@/components/profile/CategoryBreakdownList';
import { DiscoveredTopicsList } from '@/components/profile/DiscoveredTopicsList';
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
  const { profile, topics, deleteTopic } = useAppStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles } = useTheme();

  const handleViewTopic = (topicId: string) => {
    router.push({
      pathname: '/topic-detail',
      params: { topicId }
    });
  };

  const handleTestKnowledge = (topicId: string) => {
    router.push({
      pathname: '/quiz',
      params: { topicId }
    });
  };

  const handleDelete = (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;

    Alert.alert(
      'Delete Topic',
      `Are you sure you want to delete "${topic.name}"? This will permanently remove the topic and all associated quiz data from your profile.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTopic(topicId)
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

      <DiscoveredTopicsList
        topics={topics}
        onTestKnowledge={handleTestKnowledge}
        onDelete={handleDelete}
        onTopicPress={handleViewTopic}
      />
    </ScrollView>
  );
}