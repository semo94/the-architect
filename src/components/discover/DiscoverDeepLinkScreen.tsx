import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ActionButtons } from '@/components/discover/ActionButtons';
import { TopicCard } from '@/components/discover/TopicCard';
import { useTheme } from '@/contexts/ThemeContext';
import { useStreamingData } from '@/hooks/useStreamingData';
import topicService from '@/services/topicService';
import { useAppStore } from '@/store/useAppStore';
import { Topic } from '@/types';
import { hasMinimumData } from '@/utils/streamingParser';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DiscoverDeepLinkScreenProps {
  topicId?: string;
  topicName?: string;
}

export function DiscoverDeepLinkScreen({ topicId: targetTopicId, topicName: targetTopicName }: DiscoverDeepLinkScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles } = useTheme();
  const { setTopicDetail, setTopicsNeedRefresh } = useAppStore();

  const [resolvedTopicId, setResolvedTopicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const topicStreaming = useStreamingData<Topic>({
    hasMinimumData: (data) => hasMinimumData(data),
  });

  const { onProgress, handleComplete, handleError, reset, cancel } = topicStreaming;

  const fetchTopic = useCallback(async () => {
    setError(null);
    reset();

    try {
      const result = await topicService.discoverDeepLinkTopic(
        targetTopicId,
        targetTopicName,
        onProgress
      );

      setResolvedTopicId(result.topicId);
      handleComplete(result.topic);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load topic.';
      setError(msg);
      handleError(err as Error);
    }
  }, [targetTopicId, targetTopicName, onProgress, handleComplete, handleError, reset]);

  useEffect(() => {
    void fetchTopic();
    return () => { cancel(); };
  }, [fetchTopic, cancel]);

  const topic = topicStreaming.finalData;

  const handleDismiss = async () => {
    if (topic && resolvedTopicId) {
      await topicService.updateTopicStatus(resolvedTopicId, 'dismissed', 'deep_link');
      setTopicsNeedRefresh(true);
    }
    router.back();
  };

  const handleAddToBucket = async () => {
    if (topic && resolvedTopicId) {
      await topicService.updateTopicStatus(resolvedTopicId, 'discovered', 'deep_link');
      setTopicsNeedRefresh(true);
    }
    router.back();
  };

  const handleAcquireNow = async () => {
    if (topic && resolvedTopicId) {
      await topicService.updateTopicStatus(resolvedTopicId, 'discovered', 'deep_link');
      setTopicsNeedRefresh(true);
      setTopicDetail(topic);
      router.replace({ pathname: '/quiz', params: { topicId: resolvedTopicId } });
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: themeStyles.container,
    centerContainer: themeStyles.centerContainer,
    errorText: themeStyles.errorText,
    retryButton: { ...themeStyles.button, ...themeStyles.buttonPrimary },
    pressed: themeStyles.pressed,
    retryButtonText: themeStyles.buttonText,
  }), [themeStyles]);

  if (topicStreaming.isLoading && !topicStreaming.isStreaming) {
    return <LoadingSpinner message={`Loading ${targetTopicName ?? 'topic'}...`} />;
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

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
}
