import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { QuizQuestion } from '@/types';
import { SkeletonLoader } from '../common/SkeletonLoader';
import { TypewriterText, FadeInItemWrapper } from '../common/StreamingAnimations';

interface QuizData {
  questions?: QuizQuestion[];
}

interface Props {
  partialData: QuizData;
  isStreaming: boolean;
  totalExpected?: number;
}

/**
 * Streaming quiz loader that shows ONLY the first question as it streams
 * User sees question text type character-by-character, then options fade in one by one
 */
export const StreamingQuizLoader: React.FC<Props> = ({
  partialData,
  isStreaming,
  totalExpected = 4,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const styles = StyleSheet.create({
    container: {
      padding: spacing.xl,
    },
    title: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    questionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
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
      color: colors.text,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.relaxed,
      marginBottom: spacing.md,
    },
    optionsContainer: {
      marginTop: spacing.md,
    },
    optionButton: {
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      marginBottom: spacing.sm,
    },
    optionText: {
      fontSize: typography.fontSize.base,
      color: colors.text,
      fontWeight: typography.fontWeight.medium,
    },
    loadingText: {
      fontSize: typography.fontSize.base,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    progressText: {
      fontSize: typography.fontSize.sm,
      color: colors.primary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
  });

  const loadedQuestions = partialData.questions || [];
  const firstQuestion = loadedQuestions[0];
  const hasQuestion = !!firstQuestion?.question;
  const options = firstQuestion?.options || [];
  const isFirstQuestionComplete = hasQuestion && options.length === 4 && !isStreaming;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generating Your Quiz...</Text>
      <Text style={styles.progressText}>Question 1 of {totalExpected}</Text>

      {/* Show first question only */}
      {hasQuestion ? (
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>Question 1</Text>

          {/* Question text with typewriter effect */}
          <TypewriterText
            text={firstQuestion.question}
            style={styles.questionText}
            speed={15}
            instant={false}  // Always animate, never instant
          />

          {/* Options container */}
          <View style={styles.optionsContainer}>
            {/* Show available options with fade-in */}
            {options.map((option, idx) => (
              <FadeInItemWrapper key={idx} index={idx} delay={100}>
                <View style={styles.optionButton}>
                  <Text style={styles.optionText}>
                    {String.fromCharCode(65 + idx)}. {option}
                  </Text>
                </View>
              </FadeInItemWrapper>
            ))}

            {/* Show skeleton loaders for missing options */}
            {options.length < 4 &&
              Array.from({ length: 4 - options.length }).map((_, idx) => (
                <View key={`skeleton-${idx}`} style={{ marginBottom: spacing.sm }}>
                  <SkeletonLoader width="100%" height={60} />
                </View>
              ))}
          </View>
        </View>
      ) : (
        // Show skeleton while waiting for first question
        <View style={styles.questionCard}>
          <SkeletonLoader width="30%" height={16} style={{ marginBottom: spacing.sm }} />
          <SkeletonLoader width="100%" height={24} style={{ marginBottom: spacing.md }} />
          <SkeletonLoader width="100%" height={60} style={{ marginBottom: spacing.sm }} />
          <SkeletonLoader width="100%" height={60} style={{ marginBottom: spacing.sm }} />
          <SkeletonLoader width="100%" height={60} style={{ marginBottom: spacing.sm }} />
          <SkeletonLoader width="100%" height={60} />
        </View>
      )}

      {/* Status message */}
      <Text style={styles.loadingText}>
        {isFirstQuestionComplete
          ? 'Loading remaining questions...'
          : hasQuestion
          ? options.length < 4
            ? `Loading option ${options.length + 1} of 4...`
            : 'Finalizing...'
          : 'Generating first question...'}
      </Text>
    </View>
  );
};
