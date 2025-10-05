import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { QuizQuestion } from '../../types';

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
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    lineHeight: 26,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    cursor: 'pointer' as any,
  },
  pressed: {
    opacity: 0.7,
  },
  optionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  optionCorrect: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  optionIncorrect: {
    borderColor: '#f44336',
    backgroundColor: '#FFEBEE',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  optionTextSelected: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  optionTextCorrect: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  optionTextIncorrect: {
    color: '#c62828',
    fontWeight: '600',
  },
  iconText: {
    fontSize: 20,
    marginLeft: 10,
  },
  feedbackContainer: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
  },
  feedbackCorrect: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  feedbackIncorrect: {
    backgroundColor: '#FFEBEE',
    borderColor: '#f44336',
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#333',
  },
  feedbackText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
});