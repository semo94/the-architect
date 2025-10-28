import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import categorySchema from '../../constants/categories';
import { useStreamingData } from '../../hooks/useStreamingData';
import llmService from '../../services/llmService';
import { useAppStore } from '../../store/useAppStore';
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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles } = useTheme();

  const {
    topics,
    dismissedTopics,
    addTopic,
    dismissTopic
  } = useAppStore();

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
      const alreadyDiscovered = topics.map(t => t.name);

      const newTopic = await llmService.generateTopic(
        'surprise',
        alreadyDiscovered,
        dismissedTopics,
        categorySchema,
        undefined, // No constraints for surprise mode
        onProgress
      );

      handleComplete(newTopic);
    } catch (err) {
      setError('Failed to generate topic. Please try again.');
      console.error(err);
      handleError(err as Error);
    }
  }, [topics, dismissedTopics, onProgress, handleComplete, handleError, reset]);

  useEffect(() => {
    generateSurpriseTopic();

    // Cleanup: cancel streaming when component unmounts
    return () => {
      console.log('[SurpriseMe] Cleaning up - cancelling stream');
      cancel();
    };
  }, [generateSurpriseTopic, cancel]);

  const handleDismiss = () => {
    if (topic) {
      dismissTopic(topic.name);
    }
    onComplete();
  };

  const handleAddToBucket = () => {
    if (topic) {
      addTopic(topic);
    }
    onComplete();
  };

  const handleAcquireNow = () => {
    if (topic) {
      addTopic(topic);
      // Navigate to quiz using expo-router
      router.replace({
        pathname: '/quiz',
        params: { topicId: topic.id }
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