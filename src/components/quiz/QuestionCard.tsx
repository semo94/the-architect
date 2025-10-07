import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { QuizQuestion } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, CommonStyles } from '@/styles/globalStyles';

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
  const isCorrect = selectedAnswer === question.correctAnswer;

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

const styles = StyleSheet.create({
  container: {
  },
  questionContainer: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  questionText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    lineHeight: Typography.lineHeight.loose,
  },
  optionsContainer: {
    marginBottom: Spacing.xl,
  },
  optionButton: {
    ...CommonStyles.optionButton,
    padding: Spacing.lg,
  },
  pressed: CommonStyles.pressed,
  optionSelected: CommonStyles.optionSelected,
  optionCorrect: CommonStyles.optionCorrect,
  optionIncorrect: CommonStyles.optionIncorrect,
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    ...CommonStyles.optionText,
    flex: 1,
  },
  optionTextSelected: {
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.semibold,
  },
  optionTextCorrect: {
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.semibold,
  },
  optionTextIncorrect: {
    color: Colors.errorDark,
    fontWeight: Typography.fontWeight.semibold,
  },
  iconText: {
    fontSize: Typography.fontSize.xl,
    marginLeft: 10,
  },
  feedbackContainer: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  feedbackCorrect: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  feedbackIncorrect: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  feedbackTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 10,
    color: Colors.text,
  },
  feedbackText: {
    ...CommonStyles.bodyText,
  },
});