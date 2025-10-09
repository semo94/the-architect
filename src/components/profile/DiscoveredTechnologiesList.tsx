import React, { useMemo, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/common/Card';
import { Technology } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useSectionStyles } from '@/hooks/useComponentStyles';

interface DiscoveredTechnologiesListProps {
  technologies: Technology[];
  onTestKnowledge: (technologyId: string) => void;
  onDelete: (technologyId: string) => void;
}

export const DiscoveredTechnologiesList: React.FC<DiscoveredTechnologiesListProps> = ({
  technologies,
  onTestKnowledge,
  onDelete,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const sectionStyles = useSectionStyles();

  const styles = useMemo(() => StyleSheet.create({
    emptyCard: {
      marginHorizontal: spacing.xl,
      padding: spacing.xxl * 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    emptyText: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: typography.fontSize.base,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: typography.fontSize.base * 1.5,
    },
    swipeableContainer: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      position: 'relative',
    },
    actionContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      zIndex: -1,
    },
    techCard: {
      padding: spacing.xl,
      borderLeftWidth: 2,
      ...Platform.select({
        ios: {
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    techCardDiscovered: {
      borderLeftColor: colors.primary,
    },
    techCardLearned: {
      borderLeftColor: colors.success || '#10B981',
    },
    techHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    techName: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      flex: 1,
      marginRight: spacing.md,
      lineHeight: typography.fontSize.base * 1.4,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
    },
    statusBadgeDiscovered: {
      backgroundColor: colors.primaryLight,
    },
    statusBadgeLearned: {
      backgroundColor: (colors.success || '#10B981') + '15',
    },
    statusText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
    },
    statusTextDiscovered: {
      color: colors.primary,
    },
    statusTextLearned: {
      color: colors.success || '#10B981',
    },
    categoryContainer: {
      gap: spacing.sm,
    },
    categoryPill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.background,
      borderWidth: 0.5,
      borderColor: colors.textSecondary + '20',
      alignSelf: 'flex-start',
    },
    categoryText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.textSecondary,
    },
    rightAction: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 100,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderTopLeftRadius: borderRadius.md,
      borderBottomLeftRadius: borderRadius.md,
    },
    leftAction: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 100,
      backgroundColor: colors.error || '#DC2626',
      justifyContent: 'center',
      alignItems: 'center',
      borderTopRightRadius: borderRadius.md,
      borderBottomRightRadius: borderRadius.md,
    },
    actionText: {
      color: colors.white,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
      marginTop: spacing.xs,
    },
  }), [colors, typography, spacing, borderRadius]);

  const SwipeableCard = ({ tech }: { tech: Technology }) => {
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
          runOnJS(onTestKnowledge)(tech.id);
          actionTrigger.value = 0; // Reset
        } else if (trigger === 2) {
          // Delete action
          if (Platform.OS !== 'web') {
            runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Warning);
          }
          runOnJS(onDelete)(tech.id);
          actionTrigger.value = 0; // Reset
        }
      }
    );

    const panGesture = Gesture.Pan()
      .activeOffsetX([-10, 10])
      .onUpdate((event) => {
        'worklet';
        // Only allow right swipe for discovered items
        if (event.translationX > 0 && tech.status !== 'discovered') {
          return;
        }
        translateX.value = event.translationX;
      })
      .onEnd((event) => {
        'worklet';
        const translation = event.translationX;
        translateX.value = withSpring(0);

        if (translation > SWIPE_THRESHOLD && tech.status === 'discovered') {
          // Trigger test action
          actionTrigger.value = 1;
        } else if (translation < -SWIPE_THRESHOLD) {
          // Trigger delete action
          actionTrigger.value = 2;
        }
      });

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

    return (
      <View style={styles.swipeableContainer}>
        <Animated.View style={[styles.actionContainer]}>
          {tech.status === 'discovered' && (
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

        <GestureDetector gesture={panGesture}>
          <Animated.View style={animatedStyle}>
            <Card
              style={[
                styles.techCard,
                tech.status === 'learned' ? styles.techCardLearned : styles.techCardDiscovered
              ]}
            >
              <View style={styles.techHeader}>
                <Text style={styles.techName} numberOfLines={2}>
                  {tech.name}
                </Text>
                <View style={[
                  styles.statusBadge,
                  tech.status === 'learned' ? styles.statusBadgeLearned : styles.statusBadgeDiscovered
                ]}>
                  <Text style={[
                    styles.statusText,
                    tech.status === 'learned' ? styles.statusTextLearned : styles.statusTextDiscovered
                  ]}>
                    {tech.status === 'learned' ? 'Learned' : 'Discovered'}
                  </Text>
                </View>
              </View>

              <View style={styles.categoryContainer}>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryText}>
                    {tech.category}
                  </Text>
                </View>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryText}>
                    {tech.subcategory}
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  };

  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.sectionTitle}>Discovered Technologies ({technologies.length})</Text>
      {technologies.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="search-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyText}>No technologies discovered yet</Text>
          <Text style={styles.emptySubtext}>
            Visit the Discover tab to explore and{'\n'}start building your tech knowledge
          </Text>
        </Card>
      ) : (
        technologies.map((tech) => (
          <SwipeableCard key={tech.id} tech={tech} />
        ))
      )}
    </View>
  );
};
