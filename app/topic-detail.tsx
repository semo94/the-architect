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
  const { topicDetails, setTopicDetail } = useAppStore();
  const [topic, setTopic] = useState<Topic | null>(null);

  const topicId = params.topicId as string;

  useEffect(() => {
    if (!topicId) {
      return;
    }

    // Serve cached detail immediately if available
    const cached = topicDetails[topicId];
    if (cached) {
      setTopic(cached);
    }

    // Always refresh from API in background (stale-while-revalidate)
    const refreshTopic = async () => {
      try {
        const fresh = await topicService.getTopicDetail(topicId);
        setTopicDetail(fresh);
        setTopic(fresh);
      } catch {
        // If refresh fails and there's no cached version, the error state below handles it.
      }
    };

    void refreshTopic();
  }, [topicId]); // eslint-disable-line react-hooks/exhaustive-deps

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
