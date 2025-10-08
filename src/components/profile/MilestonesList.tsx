import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { Milestone } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

interface MilestonesListProps {
  milestones: Milestone[];
}

export const MilestonesList: React.FC<MilestonesListProps> = ({ milestones }) => {
  const { colors, typography, spacing, styles: themeStyles } = useTheme();

  const styles = StyleSheet.create({
    section: themeStyles.section,
    sectionTitle: themeStyles.sectionTitle,
    milestoneCard: {
      flexDirection: 'row',
      marginHorizontal: spacing.xl,
      marginBottom: 10,
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
      marginBottom: 4,
    },
    milestoneStatus: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
  });

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Milestones</Text>
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
