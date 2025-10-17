import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SkeletonLoader } from '../common/SkeletonLoader';
import { FadeInView, TypewriterText } from '../common/StreamingAnimations';

interface QuestionData {
  question?: string;
  options?: string[];
  // Flat format fields during streaming
  option_0?: string;
  option_1?: string;
  option_2?: string;
  option_3?: string;
  option_4?: string;
  option_5?: string;
}

interface Props {
  partialData: QuestionData;
  isStreaming: boolean;
  isComplete: boolean;
  onSelectOption?: (option: string) => void;
}

/**
 * Streaming question card that progressively reveals question and options
 */
export const StreamingQuestionCard: React.FC<Props> = ({
  partialData,
  isStreaming,
  isComplete,
  onSelectOption,
}) => {
  const { colors, typography, spacing, borderRadius, styles: themeStyles } = useTheme();

  const styles = StyleSheet.create({
    questionContainer: {
      padding: spacing.xl,
      backgroundColor: colors.cardBackground,
      marginTop: spacing.lg,
      marginHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
    },
    questionIcon: {
      fontSize: typography.fontSize.massive,
      marginBottom: spacing.lg,
    },
    questionText: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      textAlign: 'center',
      lineHeight: typography.lineHeight.extraLoose,
    },
    optionsContainer: {
      padding: spacing.lg,
    },
    optionButton: {
      ...themeStyles.optionButton,
      padding: spacing.xl,
    },
    optionText: {
      fontSize: typography.fontSize.base,
      color: colors.text,
      fontWeight: typography.fontWeight.medium,
      textAlign: 'center',
    },
    pressed: themeStyles.pressed,
  });

  const hasQuestion = !!partialData.question;

  // Transform flat format to array for display (during streaming)
  // Support both flat format (during streaming) and array format (after completion)
  const flatData = partialData as any;
  const options = partialData.options || [
    flatData.option_0,
    flatData.option_1,
    flatData.option_2,
    flatData.option_3,
    flatData.option_4,
    flatData.option_5,
  ].filter(Boolean);

  const expectedOptions = 4; // Default expected count for skeleton loaders

  return (
    <>
      {/* Question */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionIcon}>🧭</Text>
        {!hasQuestion ? (
          <SkeletonLoader width="80%" height={28} />
        ) : (
          <TypewriterText
            text={partialData.question || ''}
            style={styles.questionText}
            speed={15}
            instant={isComplete}
          />
        )}
      </View>

      {/* Options - show as they arrive progressively */}
      {hasQuestion && (
        <View style={styles.optionsContainer}>
          {/* Show available options with fade-in animation */}
          {options.map((option, index) => (
            <FadeInView key={index} delay={index * 100}>
              <Pressable
                style={({ pressed }) => [
                  styles.optionButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => onSelectOption?.(option)}
                disabled={!isComplete}
              >
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            </FadeInView>
          ))}

          {/* Show skeleton loaders for missing options while streaming */}
          {isStreaming && options.length < expectedOptions &&
            Array.from({ length: expectedOptions - options.length }).map((_, idx) => (
              <View key={`skeleton-${idx}`} style={{ marginBottom: spacing.md }}>
                <SkeletonLoader width="100%" height={60} />
              </View>
            ))}
        </View>
      )}
    </>
  );
};
