import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { ProfileStatistics } from '@/types';
import { Colors, Typography, Spacing, CommonStyles } from '@/styles/globalStyles';

type BreadthExpansionStatsProps = ProfileStatistics['breadthExpansion'];

export const BreadthExpansionStats: React.FC<BreadthExpansionStatsProps> = ({
  totalDiscovered,
  totalLearned,
  inBucketList,
  learningRate,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Breadth Expansion</Text>
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{totalDiscovered}</Text>
          <Text style={styles.statLabel}>Discovered</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{totalLearned}</Text>
          <Text style={styles.statLabel}>Learned</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{inBucketList}</Text>
          <Text style={styles.statLabel}>In Bucket</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{learningRate}%</Text>
          <Text style={styles.statLabel}>Learning Rate</Text>
        </Card>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: CommonStyles.section,
  sectionTitle: CommonStyles.sectionTitle,
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },
  statCard: CommonStyles.statCard,
  statNumber: CommonStyles.statNumber,
  statLabel: CommonStyles.statLabel,
});
