import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { QuizResults } from '@/components/quiz/QuizResults';
import { useTheme } from '@/contexts/ThemeContext';
import { useStreamingData } from '@/hooks/useStreamingData';
import llmService from '@/services/llmService';
import { useAppStore } from '@/store/useAppStore';
import { Quiz, QuizQuestion } from '@/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function QuizScreen() {
  const { technologyId } = useLocalSearchParams<{ technologyId: string }>();
  const router = useRouter();
  const { colors, typography, spacing, borderRadius, styles: themeStyles } = useTheme();

  const { technologies, quizzes, addQuiz } = useAppStore();
  const technology = technologies.find((t) => t.id === technologyId);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]); // Final complete questions (for quiz results)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Streaming state for quiz questions
  const quizStreaming = useStreamingData<{ questions: QuizQuestion[] }>({
    // Show UI as soon as we have the first question text (even without options)
    hasMinimumData: (data) => !!(data.questions && data.questions.length > 0 && data.questions[0]?.question),
    // Transform flat format (option_0, option_1, ...) to array format (options: [...])
    transformData: (flatData: any) => {
      console.log('[Quiz] transformData called with:', JSON.stringify(flatData).slice(0, 300));
      if (!flatData || !flatData.questions) return { questions: [] };

      // Map all questions, including partial ones during streaming
      const transformedQuestions = flatData.questions
        .map((q: any) => {
          // Collect available options (may be incomplete during streaming)
          const options = [
            q.option_0,
            q.option_1,
            q.option_2,
            q.option_3,
          ].filter((opt: any) => opt !== undefined && opt !== null && opt !== '');

          return {
            question: q.question || '',
            options: options,  // May have 0-4 options during streaming
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || '',
          };
        })
        .filter((q: any) => q.question); // Only include if has question text

      console.log('[Quiz] Transformed to', transformedQuestions.length, 'questions with',
                  transformedQuestions[0]?.options.length || 0, 'options in first');
      return {
        questions: transformedQuestions,
      };
    },
    onComplete: (data) => {
      console.log('[Quiz] onComplete called with', data.questions.length, 'questions');
      // Store final questions for quiz results
      setQuestions(data.questions);
    },
  });

  // Destructure streaming functions to avoid nested object properties in dependencies
  const { onProgress, handleComplete, handleError, reset } = quizStreaming;

  const generateQuiz = useCallback(async () => {
    if (!technology) return;

    setError(null);
    reset(); // This sets isLoading=true internally

    try {
      const generatedQuestions = await llmService.generateQuizQuestions(
        technology,
        onProgress
      );
      // Don't set questions here - let onComplete handle it to avoid premature UI transition
      handleComplete({ questions: generatedQuestions });
    } catch (err) {
      console.error('Failed to generate quiz:', err);
      setError('Failed to generate quiz questions. Please try again.');
      handleError(err as Error);
    }
  }, [technology, onProgress, handleComplete, handleError, reset]);

  useEffect(() => {
    if (technology) {
      generateQuiz();
    }
  }, [technology, generateQuiz]);

  // Helper to check if a question is complete (has all required fields for interaction)
  const isQuestionComplete = (q: Partial<QuizQuestion>): boolean => {
    return !!(
      q.question &&
      q.options?.length === 4 &&
      typeof q.correctAnswer === 'number' &&
      q.explanation
    );
  };

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setUserAnswers(newAnswers);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < 3) {  // 0-3 = 4 questions total
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowFeedback(false);
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = () => {
    if (!technology) return;

    const questions = quizStreaming.partialData.questions || [];
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
    const questions = quizStreaming.partialData.questions || [];
    let correct = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / questions.length) * 100);
  };

  const handleRetry = () => {
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
      padding: spacing.lg,
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

  // Show loading spinner before streaming starts
  if (quizStreaming.isLoading && !quizStreaming.isStreaming) {
    return <LoadingSpinner message="Preparing your quiz..." />;
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

  // Get current question from streaming data or loaded questions
  const allQuestions = quizStreaming.partialData.questions || questions;
  const currentQuestion = allQuestions[currentQuestionIndex];

  if (!currentQuestion) {
    return <LoadingSpinner message="Loading question..." />;
  }

  const isCurrentQuestionComplete = isQuestionComplete(currentQuestion);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.technologyName}>{technology.name}</Text>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of 4
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentQuestionIndex + 1) / 4) * 100}%` },
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
          isComplete={isCurrentQuestionComplete}
          selectedAnswer={userAnswers[currentQuestionIndex]}
          showFeedback={showFeedback}
          onSelectAnswer={handleAnswer}
        />
      </ScrollView>

      {showFeedback && isCurrentQuestionComplete && (
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              pressed && styles.pressed
            ]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentQuestionIndex < 3 ? 'Next Question' : 'Complete Quiz'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}