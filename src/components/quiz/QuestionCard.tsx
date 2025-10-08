import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { QuizQuestion } from '../../types';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  question: QuizQuestion;
  selectedAnswer?: number;
  showFeedback: boolean;
  onSelectAnswer: (answerIndex: number) => void;
}

export const QuestionCard: React.FC<Props> = ({
  question,
  selectedAnswer,
  showFeedback,
  onSelectAnswer,
}) => {
  const { colors, typography, spacing, borderRadius, styles: themeStyles } = useTheme();
  const isCorrect = selectedAnswer === question.correctAnswer;

  const styles = StyleSheet.create({
    container: {
    },
    questionContainer: {
      backgroundColor: colors.cardBackground,
      padding: spacing.xl,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.xl,
    },
    questionText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      lineHeight: typography.lineHeight.loose,
    },
    optionsContainer: {
      marginBottom: spacing.xl,
    },
    optionButton: {
      ...themeStyles.optionButton,
      padding: spacing.lg,
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
      marginLeft: 10,
    },
    feedbackContainer: {
      padding: spacing.xl,
      borderRadius: borderRadius.lg,
      borderWidth: 2,
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
      marginBottom: 10,
      color: colors.text,
    },
    feedbackText: {
      ...themeStyles.bodyText,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{question.question}</Text>
      </View>

      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrectOption = index === question.correctAnswer;

          const optionStyle = [styles.optionButton];
          const optionTextStyle = [styles.optionText];
          let showIcon = '';

          if (showFeedback) {
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

          return (
            <Pressable
              key={index}
              style={({ pressed }) => [
                ...optionStyle,
                pressed && !showFeedback && styles.pressed
              ]}
              onPress={() => !showFeedback && onSelectAnswer(index)}
              disabled={showFeedback}
            >
              <View style={styles.optionContent}>
                <Text style={optionTextStyle}>{option}</Text>
                {showIcon && <Text style={styles.iconText}>{showIcon}</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>

      {showFeedback && (
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
    </View>
  );
};