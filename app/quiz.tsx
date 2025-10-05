import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  Pressable,
  View,
  ScrollView,
} from 'react-native';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { QuizResults } from '@/components/quiz/QuizResults';
import llmService from '@/services/llmService';
import { useAppStore } from '@/store/useAppStore';
import { Quiz, QuizQuestion } from '@/types';

export default function QuizScreen() {
  const { technologyId } = useLocalSearchParams<{ technologyId: string }>();
  const router = useRouter();

  const { technologies, quizzes, addQuiz } = useAppStore();
  const technology = technologies.find((t) => t.id === technologyId);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizComplete, setQuizComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQuiz = useCallback(async () => {
    if (!technology) return;

    setLoading(true);
    setError(null);

    try {
      const generatedQuestions = await llmService.generateQuizQuestions(technology);
      setQuestions(generatedQuestions);
    } catch (err) {
      console.error('Failed to generate quiz:', err);
      setError('Failed to generate quiz questions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [technology]);

  useEffect(() => {
    if (technology) {
      generateQuiz();
    }
  }, [technology, generateQuiz]);

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setUserAnswers(newAnswers);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowFeedback(false);
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = () => {
    if (!technology) return;

    const score = calculateScore();
    const passed = score >= 80;

    // Count previous attempts for this technology
    const previousAttempts = quizzes.filter(
      (q) => q.technologyId === technology.id
    ).length;

    const quiz: Quiz = {
      id: `quiz-${Date.now()}`,
      technologyId: technology.id,
      technologyName: technology.name,
      questions: questions.map((q, idx) => ({
        ...q,
        userAnswer: userAnswers[idx],
      })),
      score,
      passed,
      attemptNumber: previousAttempts + 1,
      attemptedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    addQuiz(quiz);
    setQuizComplete(true);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / questions.length) * 100);
  };

  const handleRetry = () => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setShowFeedback(false);
    setQuizComplete(false);
    generateQuiz();
  };

  const handleClose = () => {
    router.back();
  };

  if (!technology) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Technology not found</Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed
          ]}
          onPress={handleClose}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Generating quiz questions...</Text>
        <Text style={styles.technologyName}>{technology.name}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed
          ]}
          onPress={generateQuiz}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && styles.pressed
          ]}
          onPress={handleClose}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (quizComplete) {
    return (
      <QuizResults
        score={calculateScore()}
        questions={questions}
        userAnswers={userAnswers}
        onClose={handleClose}
        onRetry={calculateScore() < 80 ? handleRetry : undefined}
      />
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No questions available</Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed
          ]}
          onPress={handleClose}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.technologyName}>{technology.name}</Text>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        bounces={true}
        showsVerticalScrollIndicator={true}
      >
        <QuestionCard
          question={currentQuestion}
          selectedAnswer={userAnswers[currentQuestionIndex]}
          showFeedback={showFeedback}
          onSelectAnswer={handleAnswer}
        />
      </ScrollView>

      {showFeedback && (
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              pressed && styles.pressed
            ]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete Quiz'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  technologyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    cursor: 'pointer' as any,
  },
  pressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    marginTop: 10,
    cursor: 'pointer' as any,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});