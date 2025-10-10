import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { QuizQuestion } from '../../types';
import { useTheme } from '@/contexts/ThemeContext';
import { SkeletonLoader } from '../common/SkeletonLoader';
import { TypewriterText, FadeInItemWrapper } from '../common/StreamingAnimations';

interface Props {
  question: Partial<QuizQuestion>;
  questionNumber: number;
  totalQuestions: number;
  isComplete: boolean;  // Has all required fields (question, 4 options, correctAnswer, explanation)
  selectedAnswer?: number;
  showFeedback: boolean;
  onSelectAnswer: (answerIndex: number) => void;
}

/**
 * Unified streaming question card that handles both:
 * 1. Streaming state - Shows typewriter effect for incomplete questions
 * 2. Interactive state - Allows user to answer when question is complete
 */
export const StreamingQuestionCard: React.FC<Props> = ({
  question,
  questionNumber,
  totalQuestions,
  isComplete,
  selectedAnswer,
  showFeedback,
  onSelectAnswer,
}) => {
  const { colors, typography, spacing, borderRadius, styles: themeStyles } = useTheme();

  const hasQuestion = !!question.question;
  const options = question.options || [];
  const isCorrect = isComplete && selectedAnswer === question.correctAnswer;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      padding: spacing.xl,
    },
    progressText: {
      fontSize: typography.fontSize.sm,
      color: colors.primary,
      fontWeight: typography.fontWeight.semibold,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    questionContainer: {
      backgroundColor: colors.cardBackground,
      padding: spacing.xl,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
    },
    questionNumber: {
      fontSize: typography.fontSize.sm,
      color: colors.primary,
      fontWeight: typography.fontWeight.semibold,
      marginBottom: spacing.sm,
    },
    questionText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      lineHeight: typography.lineHeight.loose,
      marginBottom: spacing.md,
    },
    optionsContainer: {
      marginTop: spacing.lg,
    },
    optionButton: {
      ...themeStyles.optionButton,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    optionDisabled: {
      opacity: 0.6,
    },
    pressed: themeStyles.pressed,
    optionSelected: themeStyles.optionSelected,
    optionCorrect: themeStyles.optionCorrect,
    optionIncorrect: themeStyles.optionIncorrect,
    optionContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    optionText: {
      ...themeStyles.optionText,
      flex: 1,
    },
    optionTextSelected: {
      color: colors.primaryDark,
      fontWeight: typography.fontWeight.semibold,
    },
    optionTextCorrect: {
      color: colors.primaryDark,
      fontWeight: typography.fontWeight.semibold,
    },
    optionTextIncorrect: {
      color: colors.errorDark,
      fontWeight: typography.fontWeight.semibold,
    },
    iconText: {
      fontSize: typography.fontSize.xl,
      marginLeft: spacing.md,
    },
    feedbackContainer: {
      padding: spacing.xl,
      borderRadius: borderRadius.lg,
      borderWidth: 2,
      marginTop: spacing.lg,
    },
    feedbackCorrect: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    feedbackIncorrect: {
      backgroundColor: colors.errorLight,
      borderColor: colors.error,
    },
    feedbackTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      marginBottom: spacing.md,
      color: colors.text,
    },
    feedbackText: {
      ...themeStyles.bodyText,
    },
    loadingText: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.md,
    },
  }), [colors, typography, spacing, borderRadius, themeStyles]);

  return (
    <View style={styles.container}>
      <Text style={styles.progressText}>
        Question {questionNumber} of {totalQuestions}
      </Text>

      <View style={styles.questionContainer}>
        <Text style={styles.questionNumber}>Question {questionNumber}</Text>

        {/* Question text - streaming or static */}
        {hasQuestion ? (
          isComplete ? (
            // Show static text when complete (no more streaming)
            <Text style={styles.questionText}>{question.question}</Text>
          ) : (
            // Show typewriter effect while streaming
            <TypewriterText
              text={question.question || ''}
              style={styles.questionText}
              speed={15}
              instant={false}
            />
          )
        ) : (
          // Show skeleton while waiting for question text
          <SkeletonLoader width="100%" height={24} style={{ marginBottom: spacing.md }} />
        )}

        {/* Options */}
        <View style={styles.optionsContainer}>
          {hasQuestion && options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectOption = index === question.correctAnswer;

            const optionStyle = [styles.optionButton];
            const optionTextStyle = [styles.optionText];
            let showIcon = '';

            // Apply feedback styles
            if (showFeedback && isComplete) {
              if (isSelected && isCorrect) {
                optionStyle.push(styles.optionCorrect as any);
                optionTextStyle.push(styles.optionTextCorrect as any);
                showIcon = '✓';
              } else if (isSelected && !isCorrect) {
                optionStyle.push(styles.optionIncorrect as any);
                optionTextStyle.push(styles.optionTextIncorrect as any);
                showIcon = '✗';
              } else if (isCorrectOption) {
                optionStyle.push(styles.optionCorrect as any);
                optionTextStyle.push(styles.optionTextCorrect as any);
                showIcon = '✓';
              }
            } else if (isSelected) {
              optionStyle.push(styles.optionSelected as any);
              optionTextStyle.push(styles.optionTextSelected as any);
            }

            // Disable if not complete
            if (!isComplete) {
              optionStyle.push(styles.optionDisabled);
            }

            return (
              <FadeInItemWrapper key={index} index={index} delay={100}>
                <Pressable
                  style={({ pressed }) => [
                    ...optionStyle,
                    pressed && isComplete && !showFeedback && styles.pressed
                  ]}
                  onPress={() => isComplete && !showFeedback && onSelectAnswer(index)}
                  disabled={!isComplete || showFeedback}
                >
                  <View style={styles.optionContent}>
                    <Text style={optionTextStyle}>
                      {String.fromCharCode(65 + index)}. {option}
                    </Text>
                    {showIcon && <Text style={styles.iconText}>{showIcon}</Text>}
                  </View>
                </Pressable>
              </FadeInItemWrapper>
            );
          })}

          {/* Show skeleton loaders for missing options */}
          {hasQuestion && options.length < 4 &&
            Array.from({ length: 4 - options.length }).map((_, idx) => (
              <View key={`skeleton-${idx}`} style={{ marginBottom: spacing.md }}>
                <SkeletonLoader width="100%" height={60} />
              </View>
            ))}

          {/* Show all skeletons if no question yet */}
          {!hasQuestion &&
            Array.from({ length: 4 }).map((_, idx) => (
              <View key={`skeleton-${idx}`} style={{ marginBottom: spacing.md }}>
                <SkeletonLoader width="100%" height={60} />
              </View>
            ))}
        </View>
      </View>

      {/* Feedback section - only show when complete and user has answered */}
      {showFeedback && isComplete && question.explanation && (
        <View style={[
          styles.feedbackContainer,
          isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect,
        ]}>
          <Text style={styles.feedbackTitle}>
            {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
          </Text>
          <Text style={styles.feedbackText}>{question.explanation}</Text>
        </View>
      )}

      {/* Loading status message */}
      {!isComplete && (
        <Text style={styles.loadingText}>
          {!hasQuestion
            ? 'Generating question...'
            : options.length < 4
            ? `Loading option ${options.length + 1} of 4...`
            : 'Finalizing question...'}
        </Text>
      )}
    </View>
  );
};
