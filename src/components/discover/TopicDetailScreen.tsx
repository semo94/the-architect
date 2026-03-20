import { ToastNotification } from '@/components/common/ToastNotification';
import { ActionButtons } from '@/components/discover/ActionButtons';
import { TopicCard } from '@/components/discover/TopicCard';
import { useTheme } from '@/contexts/ThemeContext';
import topicService from '@/services/topicService';
import { useAppStore } from '@/store/useAppStore';
import { Topic } from '@/types';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

interface TopicDetailScreenProps {
  topicId: string;
}

export function TopicDetailScreen({ topicId }: TopicDetailScreenProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { topicDetails, setTopicDetail } = useAppStore();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorVisible, setErrorVisible] = useState(false);

  useEffect(() => {
    if (!topicId) {
      setLoading(false);
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
      } finally {
        setLoading(false);
      }
    };

    void refreshTopic();
  }, [topicId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading && !topic) {
      setErrorVisible(true);
    }
  }, [loading, topic]);  

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

  if (loading) {
    return null;
  }

  if (!topic) {
    return (
      <View style={styles.container}>
        <ToastNotification
          message="Topic not found"
          visible={errorVisible}
          onDismiss={() => router.back()}
          actionLabel="Go back"
          onAction={() => router.back()}
          duration={0}
          bottomOffset={0}
        />
      </View>
    );
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
