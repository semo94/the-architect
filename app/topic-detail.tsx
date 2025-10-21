import { useRouter, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { TopicCard } from '@/components/discover/TopicCard';
import { ActionButtons } from '@/components/discover/ActionButtons';
import { useTheme } from '@/contexts/ThemeContext';

export default function TopicDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { topics } = useAppStore();

  const topicId = params.topicId as string;
  const topic = topics.find(t => t.id === topicId);

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
