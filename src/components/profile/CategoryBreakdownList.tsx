import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { ProfileStatistics } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

interface CategoryBreakdownListProps {
  categoryBreakdown: ProfileStatistics['categoryBreakdown'];
}

export const CategoryBreakdownList: React.FC<CategoryBreakdownListProps> = ({
  categoryBreakdown,
}) => {
  const { colors, typography, spacing, styles: themeStyles } = useTheme();

  const styles = StyleSheet.create({
    section: themeStyles.section,
    sectionTitle: themeStyles.sectionTitle,
    categoryCard: {
      marginHorizontal: spacing.xl,
      marginBottom: 10,
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
    progressBar: themeStyles.progressBar,
    progressFill: themeStyles.progressFill,
  });

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Category Breakdown</Text>
      {Object.entries(categoryBreakdown).map(([category, stats]) => (
        <Card key={category} style={styles.categoryCard}>
          <Text style={styles.categoryName}>{category}</Text>
          <View style={styles.categoryStats}>
            <Text style={styles.categoryText}>
              {stats.learned} learned / {stats.discovered} discovered ({stats.learningRate}%)
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${stats.learningRate}%` }]} />
          </View>
        </Card>
      ))}
    </View>
  );
};
