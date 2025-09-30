import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { Milestone } from '@/types';

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
  section: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  milestoneCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    alignItems: 'center',
    opacity: 0.6,
  },
  milestoneAchieved: {
    opacity: 1,
    backgroundColor: '#E8F5E9',
  },
  milestoneIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  milestoneStatus: {
    fontSize: 14,
    color: '#666',
  },
});
