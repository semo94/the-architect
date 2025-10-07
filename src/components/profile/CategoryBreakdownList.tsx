import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { ProfileStatistics } from '@/types';
import { Colors, Typography, Spacing, CommonStyles } from '@/styles/globalStyles';

interface CategoryBreakdownListProps {
  categoryBreakdown: ProfileStatistics['categoryBreakdown'];
}

export const CategoryBreakdownList: React.FC<CategoryBreakdownListProps> = ({
  categoryBreakdown,
}) => {
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

const styles = StyleSheet.create({
  section: CommonStyles.section,
  sectionTitle: CommonStyles.sectionTitle,
  categoryCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: 10,
    padding: Spacing.lg,
  },
  categoryName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  categoryStats: {
    marginBottom: Spacing.sm,
  },
  categoryText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  progressBar: CommonStyles.progressBar,
  progressFill: CommonStyles.progressFill,
});
