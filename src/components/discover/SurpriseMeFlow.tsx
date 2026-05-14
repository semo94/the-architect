import { useTheme } from '@/contexts/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStreamingData } from '../../hooks/useStreamingData';
import topicService from '../../services/topicService';
import { Topic } from '../../types';
import { hasMinimumData } from '../../utils/streamingParser';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ActionButtons } from './ActionButtons';
import { TopicCard } from './TopicCard';

interface Props {
  onComplete: () => void;
}

export const SurpriseMeFlow: React.FC<Props> = ({ onComplete }) => {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles } = useTheme();
  const { setTopicDetail, setTopicsNeedRefresh, setGlobalToast } = useAppStore();


  // Use streaming hook for state management and cleanup
  const topicStreaming = useStreamingData<Topic>({
    hasMinimumData: (data) => hasMinimumData(data),
    onComplete: (completedTopic) => {
      console.log('[SurpriseMe] Topic generation complete');
      setTopic(completedTopic);
    },
  });

  // Destructure streaming functions to avoid nested object properties in dependencies
  const { onProgress, handleComplete, handleError, reset, cancel } = topicStreaming;

  const generateSurpriseTopic = useCallback(async () => {
    setError(null);
    reset(); // This sets isLoading=true internally

    try {
      const result = await topicService.discoverTopic(
        'surprise',
        undefined, // No constraints for surprise mode
        onProgress
      );

      setTopicId(result.topicId);
      handleComplete(result.topic);
    } catch (err) {
      setError('Failed to generate topic. Please try again.');
      console.error(err);
      handleError(err as Error);
    }
  }, [onProgress, handleComplete, handleError, reset]);

  useEffect(() => {
    generateSurpriseTopic();

    // Cleanup: cancel streaming when component unmounts
    return () => {
      console.log('[SurpriseMe] Cleaning up - cancelling stream');
      cancel();
    };
  }, [generateSurpriseTopic, cancel]);

  const handleDismiss = async () => {
    if (topic && topicId) {
      await topicService.updateTopicStatus(topicId, 'dismissed', 'surprise');
      setTopicsNeedRefresh(true);
      setGlobalToast(`"${topic.name}" dismissed`);
    }
    onComplete();
  };

  const handleAddToBucket = async () => {
    if (topic && topicId) {
      await topicService.updateTopicStatus(topicId, 'discovered', 'surprise');
      setTopicsNeedRefresh(true);
      setGlobalToast(`"${topic.name}" saved to your bucket list`);
    }
    onComplete();
  };

  const handleAcquireNow = async () => {
    if (topic && topicId) {
      await topicService.updateTopicStatus(topicId, 'discovered', 'surprise');
      setTopicsNeedRefresh(true);
      setTopicDetail(topic);
      // Rewrite the stack to [..., topic-detail, quiz] so Back from Quiz lands
      // on the canonical owned-topic view (with the correct retake-only action
      // button) instead of the now-stale preview. The two router calls collapse
      // into one navigation state diff; only the top change (preview → quiz)
      // animates, so topic-detail is never visually flashed.
      router.replace({
        pathname: '/topic-detail',
        params: { topicId }
      });
      router.push({
        pathname: '/quiz',
        params: { topicId }
      });
    }
  };

  const handleViewDetail = async () => {
    if (topic && topicId) {
      await topicService.updateTopicStatus(topicId, 'discovered', 'surprise');
      setTopicsNeedRefresh(true);
      setTopicDetail(topic);
      // Same "save and transition to canonical view" semantic as Add to Bucket,
      // but the user lands on topic-detail instead of returning to Discover —
      // so they can immediately see hyperlinks/insights for the topic they
      // just bucketed.
      router.replace({
        pathname: '/topic-detail',
        params: { topicId }
      });
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: themeStyles.container,
    centerContainer: themeStyles.centerContainer,
    errorText: themeStyles.errorText,
    retryButton: {
      ...themeStyles.button,
      ...themeStyles.buttonPrimary,
    },
    pressed: themeStyles.pressed,
    retryButtonText: themeStyles.buttonText,
  }), [themeStyles]);

  // Show loading spinner before streaming starts
  if (topicStreaming.isLoading && !topicStreaming.isStreaming) {
    return <LoadingSpinner message="Finding something exciting for you..." />;
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
          ]}
          onPress={onComplete}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Show card - either streaming or final state
  if (!topicStreaming.isStreaming && !topic) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TopicCard
        topic={topic || topicStreaming.partialData}
        isComplete={!!topic}
        isPreview
        onViewDetail={handleViewDetail}
      />
      {topic && (
        <ActionButtons
          onDismiss={handleDismiss}
          onAddToBucket={handleAddToBucket}
          onAcquireNow={handleAcquireNow}
        />
      )}
    </View>
  );
};