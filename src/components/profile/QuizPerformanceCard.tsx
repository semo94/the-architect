import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { ProfileStatistics } from '@/types';
import { Colors, Typography, Spacing, CommonStyles } from '@/styles/globalStyles';

type QuizPerformanceCardProps = Omit<ProfileStatistics['quizPerformance'], 'firstTimePassRate'>;

export const QuizPerformanceCard: React.FC<QuizPerformanceCardProps> = ({
  totalQuizzesTaken,
  averageScore,
  passRate,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quiz Performance</Text>
      <Card style={styles.perfCard}>
        <View style={styles.perfRow}>
          <Text style={styles.perfLabel}>Quizzes Taken:</Text>
          <Text style={styles.perfValue}>{totalQuizzesTaken}</Text>
        </View>
        <View style={styles.perfRow}>
          <Text style={styles.perfLabel}>Average Score:</Text>
          <Text style={styles.perfValue}>{averageScore}%</Text>
        </View>
        <View style={styles.perfRow}>
          <Text style={styles.perfLabel}>Pass Rate:</Text>
          <Text style={styles.perfValue}>{passRate}%</Text>
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  section: CommonStyles.section,
  sectionTitle: CommonStyles.sectionTitle,
  perfCard: {
    marginHorizontal: Spacing.xl,
    padding: Spacing.xl,
  },
  perfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  perfLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  perfValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
});
