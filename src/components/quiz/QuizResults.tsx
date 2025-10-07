import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { QuizQuestion } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, CommonStyles } from '@/styles/globalStyles';

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
  const passed = score >= 80;
  const correctCount = questions.filter(
    (q, idx) => userAnswers[idx] === q.correctAnswer
  ).length;

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
            !passed && { marginTop: 12 },
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

const styles = StyleSheet.create({
  container: CommonStyles.container,
  scoreContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    borderBottomWidth: 3,
  },
  scoreContainerPassed: {
    backgroundColor: Colors.primaryLight,
    borderBottomColor: Colors.primary,
  },
  scoreContainerFailed: {
    backgroundColor: Colors.warningLight,
    borderBottomColor: Colors.warning,
  },
  scoreIcon: {
    fontSize: Typography.fontSize.giant,
    marginBottom: Spacing.lg,
  },
  scoreTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: 10,
  },
  scorePercentage: {
    fontSize: Typography.fontSize.massive,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: 5,
  },
  scoreSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  statusBadgePassed: {
    backgroundColor: Colors.primary,
  },
  statusBadgeFailed: {
    backgroundColor: Colors.warning,
  },
  statusText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  messageContainer: {
    margin: Spacing.lg,
    padding: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
  },
  messageText: {
    ...CommonStyles.bodyText,
    textAlign: 'center',
  },
  reviewContainer: {
    padding: Spacing.lg,
  },
  reviewTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  reviewQuestion: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  reviewQuestionNumber: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  reviewBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
  },
  reviewBadgeCorrect: {
    backgroundColor: Colors.primaryLight,
  },
  reviewBadgeIncorrect: {
    backgroundColor: Colors.errorLight,
  },
  reviewBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  reviewQuestionText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.lg,
    lineHeight: Typography.lineHeight.relaxed,
  },
  reviewAnswers: {
    marginBottom: Spacing.lg,
  },
  reviewAnswer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  reviewAnswerCorrect: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  reviewAnswerWrong: {
    backgroundColor: Colors.errorLight,
    borderWidth: 2,
    borderColor: Colors.error,
  },
  reviewAnswerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
  },
  explanationContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.infoLight,
    borderRadius: BorderRadius.md,
  },
  explanationLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.secondaryDark,
    marginBottom: 6,
  },
  explanationText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.secondaryDark,
    lineHeight: Typography.lineHeight.tight,
  },
  actionButtons: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  retryButton: {
    backgroundColor: Colors.warning,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  pressed: CommonStyles.pressed,
  retryButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  closeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  closeButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
});