import { Card } from '@/components/common/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { Topic, TopicType } from '@/types';
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
  topic: Topic;
  onPress: (topicId: string) => void;
  onTest?: (topicId: string) => void;
  onDelete: (topicId: string) => void;
}

export const TopicListCard: React.FC<TopicListCardProps> = ({
  topic,
  onPress,
  onTest,
  onDelete,
}) => {
  const { colors } = useTheme();
  const styles = useTopicListCardStyles();

  const translateX = useSharedValue(0);
  const actionTrigger = useSharedValue(0); // 0: none, 1: test, 2: delete
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
      }
    }
  );

  const tapGesture = Gesture.Tap().onEnd(() => {
    'worklet';
    runOnJS(onPress)(topic.id);
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

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

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
  const preview = topic.content?.what || '';
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
                    : styles.statusBadgeDiscovered,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    topic.status === 'learned'
                      ? styles.statusTextLearned
                      : styles.statusTextDiscovered,
                  ]}
                >
                  {topic.status === 'learned' ? '✓' : '📚'}
                </Text>
                <Text
                  style={[
                    styles.statusText,
                    topic.status === 'learned'
                      ? styles.statusTextLearned
                      : styles.statusTextDiscovered,
                  ]}
                >
                  {topic.status === 'learned' ? 'Learned' : 'Discovered'}
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
              <Text style={styles.footerText}>
                {getDiscoveryMethodIcon(topic.discoveryMethod)}
              </Text>
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
