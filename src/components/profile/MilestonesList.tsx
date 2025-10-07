import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { Milestone } from '@/types';
import { Colors, Typography, Spacing, CommonStyles } from '@/styles/globalStyles';

interface MilestonesListProps {
  milestones: Milestone[];
}

export const MilestonesList: React.FC<MilestonesListProps> = ({ milestones }) => {
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

const styles = StyleSheet.create({
  section: CommonStyles.section,
  sectionTitle: CommonStyles.sectionTitle,
  milestoneCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    marginBottom: 10,
    padding: Spacing.lg,
    alignItems: 'center',
    opacity: 0.6,
  },
  milestoneAchieved: {
    opacity: 1,
    backgroundColor: Colors.primaryLight,
  },
  milestoneIcon: {
    fontSize: Typography.fontSize.huge,
    marginRight: Spacing.lg,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  milestoneStatus: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
});
