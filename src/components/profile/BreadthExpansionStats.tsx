import { Card } from '@/components/common/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { ProfileStatistics } from '@/types';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

type BreadthExpansionStatsProps = ProfileStatistics['breadthExpansion'];

export const BreadthExpansionStats: React.FC<BreadthExpansionStatsProps> = ({
  totalDiscovered,
  totalLearned,
  inBucketList,
  learningRate,
}) => {
  const { typography, spacing, styles: themeStyles } = useTheme();

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const HORIZONTAL_MARGIN = spacing.xl;
  const GAP = 12;
  const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_MARGIN * 2 - GAP) / 2;

  const styles = StyleSheet.create({
    section: themeStyles.section,
    sectionTitle: themeStyles.sectionTitle,
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: HORIZONTAL_MARGIN,
      gap: GAP,
    },
    statCard: {
      width: CARD_WIDTH,
      padding: spacing.xl,
      alignItems: 'center',
    },
    statNumber: {
      fontSize: typography.fontSize.xxxl,
      fontWeight: typography.fontWeight.bold,
      color: themeStyles.statNumber.color,
    },
    statLabel: themeStyles.statLabel,
  });
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
