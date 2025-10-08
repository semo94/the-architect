import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { Milestone } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useSectionStyles } from '@/hooks/useComponentStyles';

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
      fontSize: typography.fontSize.huge,
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
            <Text style={styles.milestoneIcon}>{milestone.icon}</Text>
            <View style={styles.milestoneContent}>
              <Text style={styles.milestoneTitle}>{milestone.title}</Text>
              <Text style={styles.milestoneStatus}>
                {milestone.achievedAt ? '✓ Achieved!' : `Reach ${milestone.threshold}`}
              </Text>
            </View>
          </Card>
        );
      })}
    </View>
  );
};
