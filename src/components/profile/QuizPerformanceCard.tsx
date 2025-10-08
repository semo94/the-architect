import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { ProfileStatistics } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useSectionStyles } from '@/hooks/useComponentStyles';

type QuizPerformanceCardProps = Omit<ProfileStatistics['quizPerformance'], 'firstTimePassRate'>;

export const QuizPerformanceCard: React.FC<QuizPerformanceCardProps> = ({
  totalQuizzesTaken,
  averageScore,
  passRate,
}) => {
  const { colors, typography, spacing } = useTheme();
  const sectionStyles = useSectionStyles();

  const styles = useMemo(() => StyleSheet.create({
    perfCard: {
      marginHorizontal: spacing.xl,
      padding: spacing.xl,
    },
    perfRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
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
  }), [colors, typography, spacing]);

  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.sectionTitle}>Quiz Performance</Text>
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
