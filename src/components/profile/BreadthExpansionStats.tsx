import { Card } from '@/components/common/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { ProfileStatistics } from '@/types';
import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { useSectionStyles, useStatCardStyles } from '@/hooks/useComponentStyles';
import { getCardWidth } from '@/styles/globalStyles';

type BreadthExpansionStatsProps = ProfileStatistics['breadthExpansion'];

export const BreadthExpansionStats: React.FC<BreadthExpansionStatsProps> = ({
  totalDiscovered,
  totalLearned,
  inBucketList,
  learningRate,
}) => {
  const { spacing } = useTheme();
  const sectionStyles = useSectionStyles();
  const statStyles = useStatCardStyles();

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const HORIZONTAL_MARGIN = spacing.xl;
  const GAP = spacing.md;
  const CARD_WIDTH = getCardWidth(SCREEN_WIDTH, 2, HORIZONTAL_MARGIN, GAP);

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
      }),
    [HORIZONTAL_MARGIN, GAP, CARD_WIDTH, spacing.xl]
  );

  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.sectionTitle}>Breadth Expansion</Text>
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={statStyles.statNumber}>{totalDiscovered}</Text>
          <Text style={statStyles.statLabel}>Discovered</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={statStyles.statNumber}>{totalLearned}</Text>
          <Text style={statStyles.statLabel}>Learned</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={statStyles.statNumber}>{inBucketList}</Text>
          <Text style={statStyles.statLabel}>In Bucket</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={statStyles.statNumber}>{learningRate}%</Text>
          <Text style={statStyles.statLabel}>Learning Rate</Text>
        </Card>
      </View>
    </View>
  );
};
