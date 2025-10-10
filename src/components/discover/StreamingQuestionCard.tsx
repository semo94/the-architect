import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { SkeletonLoader } from '../common/SkeletonLoader';
import { FadeInView, TypewriterText } from '../common/StreamingAnimations';

interface QuestionData {
  question?: string;
  options?: string[];
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
  const hasOptions = partialData.options && partialData.options.length > 0;

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

      {/* Options */}
      {hasOptions && (
        <View style={styles.optionsContainer}>
          {partialData.options!.map((option, index) => (
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
        </View>
      )}

      {/* Loading skeleton for options */}
      {!hasOptions && hasQuestion && (
        <View style={styles.optionsContainer}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ marginBottom: spacing.md }}>
              <SkeletonLoader width="100%" height={60} />
            </View>
          ))}
        </View>
      )}
    </>
  );
};
