import { Card } from '@/components/common/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { useSectionStyles } from '@/hooks/useComponentStyles';
import { Milestone } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface MilestonesListProps {
  milestones: Milestone[];
}

export const MilestonesList: React.FC<MilestonesListProps> = ({ milestones }) => {
  const { colors, typography, spacing } = useTheme();
  const sectionStyles = useSectionStyles();

  const styles = useMemo(() => StyleSheet.create({
    milestoneCard: {
      flexDirection: 'row',
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      padding: spacing.lg,
      alignItems: 'center',
      opacity: 0.6,
    },
    milestoneAchieved: {
      opacity: 1,
      backgroundColor: colors.primaryLight,
    },
    milestoneIcon: {
      marginRight: spacing.lg,
    },
    milestoneContent: {
      flex: 1,
    },
    milestoneTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    milestoneStatus: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
  }), [colors, typography, spacing]);

  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.sectionTitle}>Milestones</Text>
      {milestones.map((milestone, index) => {
        const cardStyle: any = milestone.achievedAt
          ? [styles.milestoneCard, styles.milestoneAchieved]
          : styles.milestoneCard;
        return (
          <Card key={index} style={cardStyle}>
            <Ionicons
              name={milestone.icon as any}
              size={32}
              color={milestone.achievedAt ? colors.primary : colors.textLight}
              style={styles.milestoneIcon}
            />
            <View style={styles.milestoneContent}>
              <Text style={styles.milestoneTitle}>{milestone.title}</Text>
              <Text style={styles.milestoneStatus}>
                {milestone.achievedAt ? (
                  <><Ionicons name="checkmark-circle" size={14} color={colors.success || '#10B981'} /> Achieved!</>
                ) : (
                  `Reach ${milestone.threshold}`
                )}
              </Text>
            </View>
          </Card>
        );
      })}
    </View>
  );
};
