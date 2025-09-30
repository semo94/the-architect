import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { QuizQuestion } from '../../types';

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
            Excellent work! You've demonstrated a solid understanding of this technology.
            It has been marked as "learned" in your profile.
          </Text>
        </View>
      ) : (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>
            You need 80% or higher to pass. Review the explanations below and try again
            when you're ready. Each attempt generates new questions to test your understanding.
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
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Retry Quiz</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.closeButton, !passed && { marginTop: 12 }]}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>
            {passed ? 'Continue Learning' : 'Back to Profile'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scoreContainer: {
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 3,
  },
  scoreContainerPassed: {
    backgroundColor: '#E8F5E9',
    borderBottomColor: '#4CAF50',
  },
  scoreContainerFailed: {
    backgroundColor: '#FFF3E0',
    borderBottomColor: '#FF9800',
  },
  scoreIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  scoreTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  scorePercentage: {
    fontSize: 48,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
  },
  scoreSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgePassed: {
    backgroundColor: '#4CAF50',
  },
  statusBadgeFailed: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  messageContainer: {
    margin: 15,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  messageText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
  },
  reviewContainer: {
    padding: 15,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  reviewQuestion: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewQuestionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  reviewBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewBadgeCorrect: {
    backgroundColor: '#E8F5E9',
  },
  reviewBadgeIncorrect: {
    backgroundColor: '#FFEBEE',
  },
  reviewBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reviewQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    lineHeight: 24,
  },
  reviewAnswers: {
    marginBottom: 15,
  },
  reviewAnswer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  reviewAnswerCorrect: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  reviewAnswerWrong: {
    backgroundColor: '#FFEBEE',
    borderWidth: 2,
    borderColor: '#f44336',
  },
  reviewAnswerText: {
    fontSize: 14,
    color: '#333',
  },
  explanationContainer: {
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  explanationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  actionButtons: {
    padding: 15,
    paddingBottom: 30,
  },
  retryButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});