import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useTheme } from '@/contexts/ThemeContext';

export default function QuizScreen() {
  const { technologyId } = useLocalSearchParams<{ technologyId: string }>();
  const router = useRouter();
  const { colors, typography, spacing, borderRadius, styles: themeStyles } = useTheme();

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

  const styles = useMemo(() => StyleSheet.create({
    container: themeStyles.container,
    centerContainer: themeStyles.centerContainer,
    loadingText: {
      marginTop: spacing.xl,
      fontSize: typography.fontSize.base,
      color: colors.textSecondary,
    },
    errorText: themeStyles.errorText,
    technologyName: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      marginTop: spacing.md,
    },
    button: {
      ...themeStyles.button,
      ...themeStyles.buttonPrimary,
      marginTop: spacing.md,
    },
    pressed: themeStyles.pressed,
    buttonText: themeStyles.buttonText,
    cancelButton: {
      ...themeStyles.touchable,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      marginTop: spacing.md,
    },
    cancelButtonText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.base,
    },
    header: themeStyles.header,
    headerContent: {
      marginBottom: spacing.md,
    },
    progressText: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    progressBar: themeStyles.progressBar,
    progressFill: themeStyles.progressFill,
    content: {
      flex: 1,
    },
    contentContainer: {
      flexGrow: 1,
      padding: spacing.xl,
    },
    footer: themeStyles.footer,
    nextButton: {
      ...themeStyles.touchable,
      backgroundColor: colors.primary,
      paddingVertical: spacing.lg,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
    },
    nextButtonText: {
      color: colors.white,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.bold,
    },
  }), [colors, typography, spacing, borderRadius, themeStyles]);

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
        <ActivityIndicator size="large" color={colors.primary} />
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