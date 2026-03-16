import { Card } from '@/components/common/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { TopicSummary, TopicType } from '@/types';
import { getDiscoveryMethodIcon, getRelativeTime } from '@/utils/dateFormatters';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTopicListCardStyles } from './topicsStyles';

// Helper function to get color for topic type
const getTopicTypeColor = (topicType: TopicType): string => {
  const colors: Record<TopicType, string> = {
    technologies: '#3B82F6', // Blue
    patterns: '#A855F7', // Purple
    concepts: '#10B981', // Green
    practices: '#F59E0B', // Orange
    strategies: '#F59E0B', // Orange
    models: '#8B5CF6', // Violet
    frameworks: '#06B6D4', // Cyan
    protocols: '#0EA5E9', // Sky blue
    methodologies: '#EC4899', // Pink
    architectures: '#6366F1', // Indigo
  };
  return colors[topicType] || '#6B7280'; // Gray fallback
};

interface TopicListCardProps {
  topic: TopicSummary;
  onPress: (topicId: string) => void;
  onTest?: (topicId: string) => void;
  onDelete: (topicId: string) => void;
  onDismiss?: (topicId: string) => void;
  onRestore?: (topicId: string) => void;
}

export const TopicListCard: React.FC<TopicListCardProps> = ({
  topic,
  onPress,
  onTest,
  onDelete,
  onDismiss,
  onRestore,
}) => {
  const { colors } = useTheme();
  const styles = useTopicListCardStyles();

  const translateX = useSharedValue(0);
  const actionTrigger = useSharedValue(0); // 0: none, 1: test, 2: delete, 3: dismiss, 4: restore
  const SWIPE_THRESHOLD = 80;

  // Handle actions on JS thread using useAnimatedReaction
  useAnimatedReaction(
    () => actionTrigger.value,
    (trigger) => {
      if (trigger === 1) {
        // Test action
        if (Platform.OS !== 'web') {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        }
        if (onTest) {
          runOnJS(onTest)(topic.id);
        }
        actionTrigger.value = 0; // Reset
      } else if (trigger === 2) {
        // Delete action
        if (Platform.OS !== 'web') {
          runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Warning);
        }
        runOnJS(onDelete)(topic.id);
        actionTrigger.value = 0; // Reset
      } else if (trigger === 3) {
        if (Platform.OS !== 'web') {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        }
        if (onDismiss) {
          runOnJS(onDismiss)(topic.id);
        }
        actionTrigger.value = 0;
      } else if (trigger === 4) {
        if (Platform.OS !== 'web') {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        }
        if (onRestore) {
          runOnJS(onRestore)(topic.id);
        }
        actionTrigger.value = 0;
      }
    }
  );

  const tapGesture = Gesture.Tap().onEnd(() => {
    'worklet';
    if (topic.status === 'dismissed') {
      return;
    }
    runOnJS(onPress)(topic.id);
  });

  const longPressGesture = Gesture.LongPress().minDuration(500).onEnd((_event, success) => {
    'worklet';
    if (!success) {
      return;
    }

    if (topic.status === 'discovered') {
      actionTrigger.value = 3;
      return;
    }

    if (topic.status === 'dismissed') {
      actionTrigger.value = 4;
    }
  });

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      'worklet';
      // Only allow right swipe for discovered items
      if (event.translationX > 0 && topic.status !== 'discovered') {
        return;
      }
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      'worklet';
      const translation = event.translationX;
      translateX.value = withSpring(0);

      if (translation > SWIPE_THRESHOLD && topic.status === 'discovered') {
        // Trigger test action
        actionTrigger.value = 1;
      } else if (translation < -SWIPE_THRESHOLD) {
        // Trigger delete action
        actionTrigger.value = 2;
      }
    });

  const composedGesture = Gesture.Exclusive(panGesture, longPressGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 20 ? 1 : 0,
    transform: [{ scale: translateX.value > 20 ? 1 : 0.8 }],
  }));

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? 1 : 0,
    transform: [{ scale: translateX.value < -20 ? 1 : 0.8 }],
  }));

  // Truncate preview to ~80 characters
  const preview = topic.contentWhat || '';
  const truncatedPreview =
    preview.length > 80 ? preview.substring(0, 80) + '...' : preview;

  return (
    <View style={styles.swipeableContainer}>
      <Animated.View style={[styles.actionContainer]}>
        {topic.status === 'discovered' && onTest && (
          <Animated.View style={[styles.rightAction, rightActionStyle]}>
            <Ionicons name="checkmark-circle" size={28} color={colors.white} />
            <Text style={styles.actionText}>Test</Text>
          </Animated.View>
        )}
        <Animated.View style={[styles.leftAction, leftActionStyle]}>
          <Ionicons name="trash-outline" size={28} color={colors.white} />
          <Text style={styles.actionText}>Delete</Text>
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={composedGesture}>
        <Animated.View style={animatedStyle}>
          <Card
            style={[
              styles.card,
              topic.status === 'learned'
                ? styles.cardLearned
                : topic.status === 'dismissed'
                  ? styles.cardDismissed
                  : styles.cardDiscovered,
            ]}
          >
            {/* Topic Type Chip */}
            <View
              style={[
                styles.typeChip,
                {
                  backgroundColor: getTopicTypeColor(topic.topicType) + '15',
                  borderColor: getTopicTypeColor(topic.topicType) + '40',
                  borderWidth: 0.5,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  { color: getTopicTypeColor(topic.topicType) },
                ]}
              >
                {topic.topicType}
              </Text>
            </View>

            {/* Header with name and status */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.topicName} numberOfLines={2}>
                  {topic.name}
                </Text>
                <Text style={styles.breadcrumb} numberOfLines={1}>
                  {topic.category}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  topic.status === 'learned'
                    ? styles.statusBadgeLearned
                    : topic.status === 'dismissed'
                      ? styles.statusBadgeDismissed
                      : styles.statusBadgeDiscovered,
                ]}
              >
                <Ionicons
                  name={
                    topic.status === 'learned'
                      ? 'checkmark-circle'
                      : topic.status === 'dismissed'
                        ? 'ban-outline'
                        : 'book-outline'
                  }
                  size={12}
                  color={
                    topic.status === 'learned'
                      ? (colors.success || '#10B981')
                      : topic.status === 'dismissed'
                        ? colors.textSecondary
                        : colors.primary
                  }
                />
                <Text
                  style={[
                    styles.statusText,
                    topic.status === 'learned'
                      ? styles.statusTextLearned
                      : topic.status === 'dismissed'
                        ? styles.statusTextDismissed
                        : styles.statusTextDiscovered,
                  ]}
                >
                  {topic.status === 'learned' ? 'Learned' : topic.status === 'dismissed' ? 'Dismissed' : 'Discovered'}
                </Text>
              </View>
            </View>

            {/* Content Preview */}
            {truncatedPreview && (
              <Text style={styles.preview} numberOfLines={2}>
                {truncatedPreview}
              </Text>
            )}

            {/* Footer with discovery info */}
            <View style={styles.footer}>
              <Ionicons
                name={getDiscoveryMethodIcon(topic.discoveryMethod) as any}
                size={12}
                color={colors.textLight}
              />
              <Text style={styles.footerText}>
                {getRelativeTime(topic.discoveredAt)}
              </Text>
            </View>
          </Card>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};
