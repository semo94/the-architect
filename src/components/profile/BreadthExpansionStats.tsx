import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { ProfileStatistics } from '@/types';

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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
