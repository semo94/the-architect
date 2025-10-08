import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { ProfileStatistics } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

type QuizPerformanceCardProps = Omit<ProfileStatistics['quizPerformance'], 'firstTimePassRate'>;

export const QuizPerformanceCard: React.FC<QuizPerformanceCardProps> = ({
  totalQuizzesTaken,
  averageScore,
  passRate,
}) => {
  const { colors, typography, spacing, styles: themeStyles } = useTheme();

  const styles = StyleSheet.create({
    section: themeStyles.section,
    sectionTitle: themeStyles.sectionTitle,
    perfCard: {
      marginHorizontal: spacing.xl,
      padding: spacing.xl,
    },
    perfRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    perfLabel: {
      fontSize: typography.fontSize.base,
      color: colors.textSecondary,
    },
    perfValue: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
    },
  });

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
