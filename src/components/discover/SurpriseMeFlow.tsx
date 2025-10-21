import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import categorySchema from '../../constants/categories';
import llmService from '../../services/llmService';
import { useAppStore } from '../../store/useAppStore';
import { Topic } from '../../types';
import { hasMinimumData, parseStreamingJson } from '../../utils/streamingParser';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ActionButtons } from './ActionButtons';
import { TopicCard } from './TopicCard';

interface Props {
  onComplete: () => void;
}

export const SurpriseMeFlow: React.FC<Props> = ({ onComplete }) => {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [partialData, setPartialData] = useState<Partial<Topic>>({});
  const [isStreaming, setIsStreaming] = useState(false);
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

  useEffect(() => {
    generateSurpriseTopic();

    // Cleanup: cancel streaming when component unmounts
    return () => {
      console.log('[SurpriseMe] Cleaning up - cancelling stream');
      llmService.cancelStream();
    };
     
  }, []);

  const generateSurpriseTopic = async () => {
    setLoading(true);
    setPartialData({});
    setIsStreaming(false);
    setError(null);

    try {
      const alreadyDiscovered = topics.map(t => t.name);

      const newTopic = await llmService.generateTopic(
        'surprise',
        alreadyDiscovered,
        dismissedTopics,
        categorySchema,
        undefined, // No constraints for surprise mode
        (partialText) => {
          // Parse the streaming JSON progressively
          const parsed = parseStreamingJson(partialText);
          setPartialData(parsed);

          // Once we have minimum data, show the streaming card
          if (hasMinimumData(parsed)) {
            setIsStreaming(true);
            setLoading(false);
          }
        }
      );

      setTopic(newTopic);
      setIsStreaming(false); // Stop streaming, show final card
    } catch (err) {
      setError('Failed to generate topic. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
      router.push({
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

  if (loading) {
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
  if (!isStreaming && !topic) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TopicCard
        topic={topic || partialData}
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