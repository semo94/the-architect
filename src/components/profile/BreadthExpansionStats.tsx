import { Card } from '@/components/common/Card';
import { CommonStyles, Spacing, Typography } from '@/styles/globalStyles';
import { ProfileStatistics } from '@/types';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HORIZONTAL_MARGIN = Spacing.xl;
const GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_MARGIN * 2 - GAP) / 2;

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
    paddingHorizontal: HORIZONTAL_MARGIN,
    gap: GAP,
  },
  statCard: {
    width: CARD_WIDTH,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: CommonStyles.statNumber.color,
  },
  statLabel: CommonStyles.statLabel,
});
