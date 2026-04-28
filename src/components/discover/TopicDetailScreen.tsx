import { ToastNotification } from '@/components/common/ToastNotification';
import { ActionButtons } from '@/components/discover/ActionButtons';
import { TopicCard } from '@/components/discover/TopicCard';
import { InsightsPanel } from '@/components/topics/InsightsPanel';
import { useTheme } from '@/contexts/ThemeContext';
import { SSEClient } from '@/services/sseService';
import topicService from '@/services/topicService';
import { useAppStore } from '@/store/useAppStore';
import { InsightGroup, InsightItem, Topic } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface TopicDetailScreenProps {
  topicId: string;
}

export function TopicDetailScreen({ topicId }: TopicDetailScreenProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { topicDetails, setTopicDetail } = useAppStore();
  const [topic, setTopic] = useState<Topic | null>(null);
  useEffect(() => { topicRef.current = topic; }, [topic]);
  const [loading, setLoading] = useState(true);
  const [errorVisible, setErrorVisible] = useState(false);
  const [insightGroups, setInsightGroups] = useState<InsightGroup[]>([]);
  const [insightsPanelVisible, setInsightsPanelVisible] = useState(false);
  const [insightsPanelStatus, setInsightsPanelStatus] = useState<'processing' | 'ready' | 'failed'>('processing');
  const eventsClientRef = useRef<SSEClient>(new SSEClient());
  const topicRef = useRef<Topic | null>(null);

  const refreshTopic = useCallback(async () => {
    if (!topicId) {
      setLoading(false);
      return;
    }

    // Serve cached detail immediately if available
    const cached = topicDetails[topicId];
    if (cached) {
      setTopic(cached);
    }

    try {
      const fresh = await topicService.getTopicDetail(topicId);
      setTopicDetail(fresh);
      setTopic(fresh);

      let effectiveTopic = fresh;

      // Auto-retry failed hyperlink extraction (fire-and-forget, non-critical)
      if (fresh.hyperlinksStatus === 'failed') {
        try {
          await topicService.triggerHyperlinks(fresh.id);
          effectiveTopic = { ...fresh, hyperlinksStatus: 'processing' as const };
          setTopic(effectiveTopic);
          setTopicDetail(effectiveTopic);
        } catch {
          // Silently ignore — hyperlinks are non-critical
        }
      }

      // Start events SSE if either status is processing
      if (effectiveTopic.hyperlinksStatus === 'processing' || effectiveTopic.insightsStatus === 'processing') {
        void startEventsStream(effectiveTopic);
      }
    } catch {
      // If refresh fails and there's no cached version, show error
    } finally {
      setLoading(false);
    }
  }, [topicId]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      void refreshTopic();

      return () => {
        eventsClientRef.current.cancel();
      };
    }, [refreshTopic])
  );

  React.useEffect(() => {
    if (!loading && !topic) {
      setErrorVisible(true);
    }
  }, [loading, topic]);

  const startEventsStream = useCallback(async (currentTopic: Topic) => {
    eventsClientRef.current.cancel();

    const authHeader = await topicService.getAuthHeader();
    eventsClientRef.current.connectGet(
      topicService.getTopicEventsUrl(currentTopic.id),
      {
        onMessage: (data) => {
          if (data.type === 'status') {
            const prev = topicRef.current;
            if (!prev) return;
            const updated = {
              ...prev,
              hyperlinksStatus: data.hyperlinksStatus ?? prev.hyperlinksStatus,
              insightsStatus: data.insightsStatus ?? prev.insightsStatus,
              hyperlinks: data.hyperlinks ?? prev.hyperlinks,
            };
            setTopic(updated);
            setTopicDetail(updated);
          }
          if (data.type === 'done') {
            eventsClientRef.current.cancel();
          }
        },
        onError: () => {
          eventsClientRef.current.cancel();
        },
        onComplete: () => {
          eventsClientRef.current.cancel();
        },
      },
      { headers: authHeader, credentials: 'include' }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getLinkVariant = useCallback(
    (name: string): 'owned' | 'discoverable' => {
      if (!topic?.hyperlinks) return 'discoverable';
      const match = topic.hyperlinks.find(
        (h) => h.targetName.toLowerCase() === name.toLowerCase()
      );
      return match?.owned ? 'owned' : 'discoverable';
    },
    [topic?.hyperlinks]
  );

  const handleTopicPress = useCallback(
    (name: string) => {
      if (!topic?.hyperlinks) return;
      const match = topic.hyperlinks.find(
        (h) => h.targetName.toLowerCase() === name.toLowerCase()
      );
      if (match?.targetTopicId) {
        router.push({ pathname: '/topic-detail', params: { topicId: match.targetTopicId } });
      } else {
        router.push({
           
          pathname: '/discover-deep-link' as any,
          params: { topicName: name },
        });
      }
    },
    [topic?.hyperlinks, router]
  );

  const handleInsightPress = useCallback(
    (item: InsightItem) => {
      setInsightsPanelVisible(false);
      if (item.targetTopicId) {
        router.push({ pathname: '/topic-detail', params: { topicId: item.targetTopicId } });
      } else {
        router.push({
           
          pathname: '/discover-deep-link' as any,
          params: { topicName: item.targetName },
        });
      }
    },
    [router]
  );

  /**
   * When SSE delivers insightsStatus='ready' while the panel is open showing a
   * skeleton, auto-fetch GET /insights so the panel updates without user action.
   * When SSE delivers 'failed', surface the error immediately.
   */
  useEffect(() => {
    if (!insightsPanelVisible || insightsPanelStatus !== 'processing' || !topic?.id) return;

    if (topic.insightsStatus === 'ready') {
      topicService.getInsights(topic.id)
        .then((data) => {
          setInsightGroups(data.groups);
          setInsightsPanelStatus('ready');
        })
        .catch(() => {
          setInsightsPanelStatus('failed');
        });
    } else if (topic.insightsStatus === 'failed') {
      setInsightsPanelStatus('failed');
    }
  // Intentionally omits insightsPanelVisible and insightsPanelStatus from deps.
  // This effect must only fire when topic.insightsStatus changes (SSE push), not
  // when the panel opens. insightsPanelVisible/Status are read as guards inside
  // but should not be triggers — otherwise opening the panel while status is
  // already 'ready' causes a duplicate GET /insights alongside handleBulbPress.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic?.insightsStatus, topic?.id]);

  const handleBulbPress = useCallback(async () => {
    if (!topic) return;

    if (topic.insightsStatus === 'processing') {
      // Async generation is in flight — SSE is already open and will deliver the
      // update. Just open the panel with a skeleton.
      setInsightGroups([]);
      setInsightsPanelStatus('processing');
      setInsightsPanelVisible(true);
      return;
    }

    if (topic.insightsStatus === 'ready') {
      // Instant DB cache hit — open skeleton then immediately resolve.
      setInsightGroups([]);
      setInsightsPanelStatus('processing');
      setInsightsPanelVisible(true);
      try {
        const data = await topicService.getInsights(topic.id);
        setInsightGroups(data.groups);
        setInsightsPanelStatus('ready');
      } catch {
        setInsightsPanelStatus('failed');
      }
      return;
    }

    // null or 'failed' — trigger async generation via POST, then open skeleton.
    // SSE delivers the completion push (insights_ready → useEffect auto-fetches).
    setInsightGroups([]);
    setInsightsPanelStatus('processing');
    setInsightsPanelVisible(true);
    try {
      await topicService.triggerInsights(topic.id);
      const updated = { ...topic, insightsStatus: 'processing' as const };
      setTopic(updated);
      setTopicDetail(updated);
      void startEventsStream(updated);
    } catch {
      setInsightsPanelStatus('failed');
    }
  }, [topic, startEventsStream]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAcquireNow = () => {
    if (!topic) return;
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

  if (!loading && !topic) {
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

  const showHyperlinks = !loading && topic?.hyperlinksStatus === 'ready';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => {
            if (!topic) return null;
            const isProcessing = topic.insightsStatus === 'processing';
            const activeColor = isDark ? colors.warning : colors.white;
            const processingColor = isDark ? colors.textSecondary : 'rgba(255,255,255,0.5)';
            return (
              <TouchableOpacity
                onPress={handleBulbPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons
                    name={isProcessing ? 'bulb-outline' : 'bulb'}
                    size={22}
                    color={isProcessing ? processingColor : activeColor}
                  />
                </View>
              </TouchableOpacity>
            );
          },
        }}
      />
      <TopicCard
        topic={topic ?? {}}
        isComplete={!loading}
        onTopicPress={showHyperlinks ? handleTopicPress : undefined}
        getLinkVariant={showHyperlinks ? getLinkVariant : undefined}
      />

      {!loading && topic?.status === 'discovered' && (
        <ActionButtons onAcquireNow={handleAcquireNow} />
      )}

      <InsightsPanel
        visible={insightsPanelVisible}
        onDismiss={() => setInsightsPanelVisible(false)}
        status={insightsPanelStatus}
        groups={insightGroups}
        onInsightPress={handleInsightPress}
        onRetry={async () => {
          if (!topic) return;
          setInsightGroups([]);
          setInsightsPanelStatus('processing');
          try {
            await topicService.triggerInsights(topic.id);
            const updated = { ...topic, insightsStatus: 'processing' as const };
            setTopic(updated);
            setTopicDetail(updated);
            void startEventsStream(updated);
          } catch {
            setInsightsPanelStatus('failed');
          }
        }}
      />
    </View>
  );
}

