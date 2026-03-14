import { ActionButtons } from '@/components/discover/ActionButtons';
import { TopicCard } from '@/components/discover/TopicCard';
import { useTheme } from '@/contexts/ThemeContext';
import topicService from '@/services/topicService';
import { useAppStore } from '@/store/useAppStore';
import { Topic } from '@/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

export default function TopicDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { topics } = useAppStore();
  const [topicFromApi, setTopicFromApi] = useState<Topic | null>(null);

  const topicId = params.topicId as string;
  const topic = topics.find(t => t.id === topicId) ?? topicFromApi;

  useEffect(() => {
    if (!topicId || topic) {
      return;
    }

    const loadTopic = async () => {
      try {
        const loaded = await topicService.getTopicDetail(topicId);
        setTopicFromApi(loaded);
      } catch {
        // Keep null to trigger the existing error state.
      }
    };

    void loadTopic();
  }, [topicId, topic]);

  const handleAcquireNow = () => {
    if (!topic) return;

    // Navigate to quiz screen
    // Topic will be marked as 'learned' only after passing the quiz (score >= 80%)
    router.push({
      pathname: '/quiz',
      params: { topicId: topic.id }
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  if (!topic) {
    // Handle case where topic doesn't exist
    Alert.alert('Error', 'Topic not found', [
      { text: 'OK', onPress: () => router.back() }
    ]);
    return null;
  }

  return (
    <View style={styles.container}>
      <TopicCard
        topic={topic}
        isComplete={true}
      />
      {/* Only show "Acquire Now" button if topic is still in 'discovered' status */}
      {topic.status === 'discovered' && (
        <ActionButtons onAcquireNow={handleAcquireNow} />
      )}
    </View>
  );
}
