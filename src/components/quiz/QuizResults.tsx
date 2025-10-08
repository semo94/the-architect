import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { QuizQuestion } from '../../types';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  score: number;
  questions: QuizQuestion[];
  userAnswers: number[];
  onClose: () => void;
  onRetry?: () => void;
}

export const QuizResults: React.FC<Props> = ({
  score,
  questions,
  userAnswers,
  onClose,
  onRetry,
}) => {
  const { colors, typography, spacing, borderRadius, styles: themeStyles } = useTheme();
  const passed = score >= 80;
  const correctCount = questions.filter(
    (q, idx) => userAnswers[idx] === q.correctAnswer
  ).length;

  const styles = useMemo(() => StyleSheet.create({
    container: themeStyles.container,
    scoreContainer: {
      padding: spacing.xxl,
      alignItems: 'center',
      borderBottomWidth: 3,
    },
    scoreContainerPassed: {
      backgroundColor: colors.primaryLight,
      borderBottomColor: colors.primary,
    },
    scoreContainerFailed: {
      backgroundColor: colors.warningLight,
      borderBottomColor: colors.warning,
    },
    scoreIcon: {
      fontSize: typography.fontSize.giant,
      marginBottom: spacing.lg,
    },
    scoreTitle: {
      fontSize: typography.fontSize.xxl,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    scorePercentage: {
      fontSize: typography.fontSize.massive,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    scoreSubtitle: {
      fontSize: typography.fontSize.base,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    statusBadge: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.xl,
    },
    statusBadgePassed: {
      backgroundColor: colors.primary,
    },
    statusBadgeFailed: {
      backgroundColor: colors.warning,
    },
    statusText: {
      color: colors.white,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
    },
    messageContainer: {
      margin: spacing.lg,
      padding: spacing.xl,
      backgroundColor: colors.cardBackground,
      borderRadius: borderRadius.lg,
    },
    messageText: {
      ...themeStyles.bodyText,
      textAlign: 'center',
    },
    reviewContainer: {
      padding: spacing.lg,
    },
    reviewTitle: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    reviewQuestion: {
      backgroundColor: colors.cardBackground,
      padding: spacing.xl,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    reviewQuestionNumber: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textSecondary,
    },
    reviewBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.lg,
    },
    reviewBadgeCorrect: {
      backgroundColor: colors.primaryLight,
    },
    reviewBadgeIncorrect: {
      backgroundColor: colors.errorLight,
    },
    reviewBadgeText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold,
    },
    reviewQuestionText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      marginBottom: spacing.lg,
      lineHeight: typography.lineHeight.relaxed,
    },
    reviewAnswers: {
      marginBottom: spacing.lg,
    },
    reviewAnswer: {
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
      backgroundColor: colors.background,
    },
    reviewAnswerCorrect: {
      backgroundColor: colors.primaryLight,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    reviewAnswerWrong: {
      backgroundColor: colors.errorLight,
      borderWidth: 2,
      borderColor: colors.error,
    },
    reviewAnswerText: {
      fontSize: typography.fontSize.sm,
      color: colors.text,
    },
    explanationContainer: {
      padding: spacing.md,
      backgroundColor: colors.infoLight,
      borderRadius: borderRadius.md,
    },
    explanationLabel: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
      color: colors.secondaryDark,
      marginBottom: spacing.sm,
    },
    explanationText: {
      fontSize: typography.fontSize.sm,
      color: colors.secondaryDark,
      lineHeight: typography.lineHeight.tight,
    },
    actionButtons: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    retryButton: {
      backgroundColor: colors.warning,
      paddingVertical: spacing.lg,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      cursor: 'pointer' as any,
    },
    pressed: themeStyles.pressed,
    retryButtonText: {
      color: colors.white,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.bold,
    },
    closeButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.lg,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      cursor: 'pointer' as any,
    },
    closeButtonText: {
      color: colors.white,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.bold,
    },
  }), [colors, typography, spacing, borderRadius, themeStyles]);

  return (
    <ScrollView style={styles.container}>
      <View style={[
        styles.scoreContainer,
        passed ? styles.scoreContainerPassed : styles.scoreContainerFailed,
      ]}>
        <Text style={styles.scoreIcon}>{passed ? '🎉' : '📚'}</Text>
        <Text style={styles.scoreTitle}>
          {passed ? 'Congratulations!' : 'Keep Learning!'}
        </Text>
        <Text style={styles.scorePercentage}>{score}%</Text>
        <Text style={styles.scoreSubtitle}>
          {correctCount} out of {questions.length} correct
        </Text>
        <View style={[
          styles.statusBadge,
          passed ? styles.statusBadgePassed : styles.statusBadgeFailed,
        ]}>
          <Text style={styles.statusText}>
            {passed ? '✓ Passed' : 'Try Again'}
          </Text>
        </View>
      </View>

      {passed ? (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>
            Excellent work! You&apos;ve demonstrated a solid understanding of this technology.
            It has been marked as &quot;learned&quot; in your profile.
          </Text>
        </View>
      ) : (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>
            You need 80% or higher to pass. Review the explanations below and try again
            when you&apos;re ready. Each attempt generates new questions to test your understanding.
          </Text>
        </View>
      )}

      <View style={styles.reviewContainer}>
        <Text style={styles.reviewTitle}>Question Review</Text>

        {questions.map((question, idx) => {
          const userAnswer = userAnswers[idx];
          const isCorrect = userAnswer === question.correctAnswer;

          return (
            <View key={idx} style={styles.reviewQuestion}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewQuestionNumber}>Question {idx + 1}</Text>
                <View style={[
                  styles.reviewBadge,
                  isCorrect ? styles.reviewBadgeCorrect : styles.reviewBadgeIncorrect,
                ]}>
                  <Text style={styles.reviewBadgeText}>
                    {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </Text>
                </View>
              </View>

              <Text style={styles.reviewQuestionText}>{question.question}</Text>

              <View style={styles.reviewAnswers}>
                {question.options.map((option, optIdx) => {
                  const isUserAnswer = userAnswer === optIdx;
                  const isCorrectAnswer = question.correctAnswer === optIdx;

                  const answerStyle = [styles.reviewAnswer];
                  if (isCorrectAnswer) {
                    answerStyle.push(styles.reviewAnswerCorrect as any);
                  } else if (isUserAnswer && !isCorrect) {
                    answerStyle.push(styles.reviewAnswerWrong as any);
                  }

                  return (
                    <View key={optIdx} style={answerStyle}>
                      <Text style={styles.reviewAnswerText}>
                        {isCorrectAnswer && '✓ '}
                        {isUserAnswer && !isCorrectAnswer && '✗ '}
                        {option}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.explanationContainer}>
                <Text style={styles.explanationLabel}>Explanation:</Text>
                <Text style={styles.explanationText}>{question.explanation}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.actionButtons}>
        {!passed && onRetry && (
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.pressed
            ]}
            onPress={onRetry}
          >
            <Text style={styles.retryButtonText}>Retry Quiz</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.closeButton,
            !passed && { marginTop: spacing.md },
            pressed && styles.pressed
          ]}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>
            {passed ? 'Continue Learning' : 'Back to Profile'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};