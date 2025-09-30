import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { ProfileStatistics } from '@/types';

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
  categoryCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  categoryStats: {
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
});
