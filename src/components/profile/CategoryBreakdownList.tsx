import { Card } from '@/components/common/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { useProgressBarStyles, useSectionStyles } from '@/hooks/useComponentStyles';
import { ProfileStatistics } from '@/types';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CategoryBreakdownListProps {
  categoryBreakdown: ProfileStatistics['categoryBreakdown'];
}

export const CategoryBreakdownList: React.FC<CategoryBreakdownListProps> = ({
  categoryBreakdown,
}) => {
  const { colors, typography, spacing } = useTheme();
  const sectionStyles = useSectionStyles();
  const progressBarStyles = useProgressBarStyles();

  const styles = useMemo(() => StyleSheet.create({
    categoryCard: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      padding: spacing.lg,
    },
    categoryName: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    categoryStats: {
      marginBottom: spacing.sm,
    },
    categoryText: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
    emptyText: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
    },
  }), [colors, typography, spacing]);

  const entries = Object.entries(categoryBreakdown);

  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.sectionTitle}>Category Breakdown</Text>
      {entries.length === 0 ? (
        <Text style={styles.emptyText}>Start discovering topics to see your category breakdown.</Text>
      ) : (
        entries.map(([category, stats]) => (
          <Card key={category} style={styles.categoryCard}>
            <Text style={styles.categoryName}>{category}</Text>
            <View style={styles.categoryStats}>
              <Text style={styles.categoryText}>
                {stats.learned} learned / {stats.discovered} discovered ({stats.learningRate}%)
              </Text>
            </View>
            <View style={progressBarStyles.progressBar}>
              <View style={[progressBarStyles.progressFill, { width: `${stats.learningRate}%` }]} />
            </View>
          </Card>
        ))
      )}
    </View>
  );
};
