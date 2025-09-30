import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { ProfileStatistics } from '@/types';

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
  perfCard: {
    marginHorizontal: 20,
    padding: 20,
  },
  perfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  perfLabel: {
    fontSize: 16,
    color: '#666',
  },
  perfValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
