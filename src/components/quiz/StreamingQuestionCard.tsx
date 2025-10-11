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
  isComplete,
  selectedAnswer,
  showFeedback,
  onSelectAnswer,
}) => {
  const { colors, typography, spacing, borderRadius, styles: themeStyles } = useTheme();

  const hasQuestion = !!question.question;
  const options = question.options || [];
  const isCorrect = isComplete && selectedAnswer === question.correctAnswer;

  const optionLabels = ['A', 'B', 'C', 'D'];

  const styles = useMemo(() => StyleSheet.create({
    container: {
    },
    questionContainer: {
      ...themeStyles.card,
      padding: spacing.lg,
    },
    questionText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      lineHeight: typography.lineHeight.loose,
    },
    optionsContainer: {
      marginTop: spacing.lg,
    },
    optionButton: {
      ...themeStyles.optionButton,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    optionLabel: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.round,
      backgroundColor: colors.primaryLight,
      borderWidth: 2,
      borderColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
      flexShrink: 0,
    },
    optionLabelText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.bold,
      color: colors.primary,
    },
    optionLabelSelected: {
      backgroundColor: colors.primary,
    },
    optionLabelTextSelected: {
      color: colors.white,
    },
    optionLabelCorrect: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionLabelTextCorrect: {
      color: colors.white,
    },
    optionLabelIncorrect: {
      backgroundColor: colors.errorLight,
      borderColor: colors.error,
    },
    optionLabelTextIncorrect: {
      color: colors.errorDark,
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
      alignItems: 'center',
      flex: 1,
    },
    optionTextWrapper: {
      flex: 1,
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
      {/* Question Container - Separated */}
      <View style={styles.questionContainer}>
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
      </View>

      {/* Options Container - Separated from question */}
      <View style={styles.optionsContainer}>
        {hasQuestion && options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectOption = index === question.correctAnswer;

            const optionStyle = [styles.optionButton];
            const optionTextStyle = [styles.optionText];
            const optionLabelStyle = [styles.optionLabel];
            const optionLabelTextStyle = [styles.optionLabelText];
            let showIcon = '';

            // Apply feedback styles
            if (showFeedback && isComplete) {
              if (isSelected && isCorrect) {
                optionStyle.push(styles.optionCorrect as any);
                optionTextStyle.push(styles.optionTextCorrect as any);
                optionLabelStyle.push(styles.optionLabelCorrect as any);
                optionLabelTextStyle.push(styles.optionLabelTextCorrect as any);
                showIcon = '✓';
              } else if (isSelected && !isCorrect) {
                optionStyle.push(styles.optionIncorrect as any);
                optionTextStyle.push(styles.optionTextIncorrect as any);
                optionLabelStyle.push(styles.optionLabelIncorrect as any);
                optionLabelTextStyle.push(styles.optionLabelTextIncorrect as any);
                showIcon = '✗';
              } else if (isCorrectOption) {
                optionStyle.push(styles.optionCorrect as any);
                optionTextStyle.push(styles.optionTextCorrect as any);
                optionLabelStyle.push(styles.optionLabelCorrect as any);
                optionLabelTextStyle.push(styles.optionLabelTextCorrect as any);
                showIcon = '✓';
              }
            } else if (isSelected) {
              optionStyle.push(styles.optionSelected as any);
              optionTextStyle.push(styles.optionTextSelected as any);
              optionLabelStyle.push(styles.optionLabelSelected as any);
              optionLabelTextStyle.push(styles.optionLabelTextSelected as any);
            }

            // Disable if not complete
            if (!isComplete) {
              optionStyle.push(styles.optionDisabled as any);
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
                    {/* Option Label (A, B, C, D) */}
                    <View style={optionLabelStyle}>
                      <Text style={optionLabelTextStyle}>{optionLabels[index]}</Text>
                    </View>
                    {/* Option Text and Icon */}
                    <View style={styles.optionTextWrapper}>
                      <Text style={optionTextStyle}>{option}</Text>
                      {showIcon && <Text style={styles.iconText}>{showIcon}</Text>}
                    </View>
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
