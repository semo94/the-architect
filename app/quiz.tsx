import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { QuizResults } from '@/components/quiz/QuizResults';
import { useTheme } from '@/contexts/ThemeContext';
import { useStreamingData } from '@/hooks/useStreamingData';
import quizService from '@/services/quizService';
import { useAppStore } from '@/store/useAppStore';
import { QuizQuestion } from '@/types';
import { shuffleQuestionOptions, unshuffleAnswerIndex } from '@/utils/quizShuffle';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function QuizScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const router = useRouter();
  const { colors, typography, spacing, borderRadius, styles: themeStyles } = useTheme();

  const { topics, topicDetails, updateTopicStatusInCache } = useAppStore();
  const topic = topics.find((t) => t.id === topicId) ?? (topicId ? topicDetails[topicId] : undefined);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]); // Final shuffled questions (for quiz results)
  const [quizId, setQuizId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [finalScore, setFinalScore] = useState<number>(0); // Store the final score to avoid recalculation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-question shuffle: populated individually as each question's options arrive
  const [shuffledQuestions, setShuffledQuestions] = useState<(QuizQuestion | null)[]>([]);
  const [shuffleMaps, setShuffleMaps] = useState<number[][]>([]);
  const shuffledIndicesRef = useRef<Set<number>>(new Set());

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

      setShuffledQuestions((prev) => {
        const merged = [...prev];
        const mergedMaps: number[][] = [];

        data.questions.forEach((q, index) => {
          if (merged[index]) {
            // Already shuffled during streaming — keep it
            return;
          }
          // Shuffle any questions that weren't handled during streaming
          const { question: sq, indexMap } = shuffleQuestionOptions(q);
          shuffledIndicesRef.current.add(index);
          merged[index] = sq;
          mergedMaps[index] = indexMap;
        });

        // Set final questions for QuizResults
        setQuestions(merged.filter((q): q is QuizQuestion => q !== null));

        // Merge maps for any newly-shuffled questions
        if (mergedMaps.length > 0) {
          setShuffleMaps((prevMaps) => {
            const updated = [...prevMaps];
            mergedMaps.forEach((map, i) => {
              if (map) updated[i] = map;
            });
            return updated;
          });
        }

        return merged;
      });
    },
  });

  // Destructure streaming functions to avoid nested object properties in dependencies
  const { onProgress, handleComplete, handleError, reset, cancel } = quizStreaming;

  const generateQuiz = useCallback(async () => {
    if (!topic) return;

    setError(null);
    reset(); // This sets isLoading=true internally

    try {
      const result = await quizService.generateQuiz(topic.id, onProgress);
      setQuizId(result.quizId);
      // Don't set questions here - let onComplete handle it to avoid premature UI transition
      handleComplete({ questions: result.questions });
    } catch (err) {
      console.error('Failed to generate quiz:', err);
      setError('Failed to generate quiz questions. Please try again.');
      handleError(err as Error);
    }
  }, [topic, onProgress, handleComplete, handleError, reset]);

  useEffect(() => {
    if (!topic) {
      return;
    }

    // Auto-generate only when entering the screen for a topic.
    // Prevent re-generation after submission/result state updates.
    if (
      quizComplete ||
      !!quizId ||
      questions.length > 0 ||
      quizStreaming.isLoading ||
      quizStreaming.isStreaming
    ) {
      return;
    }

    void generateQuiz();
  }, [
    topic,
    generateQuiz,
    quizComplete,
    quizId,
    questions.length,
    quizStreaming.isLoading,
    quizStreaming.isStreaming,
  ]);

  useEffect(() => {
    // Cleanup only on unmount.
    return () => {
      console.log('[Quiz] Cleaning up - cancelling stream');
      cancel();
    };
  }, [cancel]);

  // Shuffle each question's options as soon as all 4 arrive during streaming
  useEffect(() => {
    const partialQuestions = quizStreaming.partialData.questions;
    if (!partialQuestions) return;

    partialQuestions.forEach((q, index) => {
      if (shuffledIndicesRef.current.has(index)) return;
      // Check that all 4 options, correctAnswer, and explanation are present
      if (
        q.options?.length === 4 &&
        typeof q.correctAnswer === 'number' &&
        q.explanation
      ) {
        const { question: sq, indexMap } = shuffleQuestionOptions(q as QuizQuestion);
        shuffledIndicesRef.current.add(index);
        setShuffledQuestions((prev) => {
          const next = [...prev];
          next[index] = sq;
          return next;
        });
        setShuffleMaps((prev) => {
          const next = [...prev];
          next[index] = indexMap;
          return next;
        });
      }
    });
  }, [quizStreaming.partialData]);

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
      void completeQuiz();
    }
  };

  const completeQuiz = async () => {
    if (!topic || !quizId) {
      setError('Quiz not ready. Please retry generation.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Map shuffled display indices back to original indices for backend
      const originalAnswers = userAnswers.map((displayIndex, qIndex) => {
        const map = shuffleMaps[qIndex];
        return map ? unshuffleAnswerIndex(displayIndex, map) : displayIndex;
      });
      const result = await quizService.submitQuizAttempt(quizId, originalAnswers);

      if (result.topicStatusUpdated) {
        updateTopicStatusInCache(topic.id, 'learned');
      }

      setFinalScore(result.score);
      setQuizComplete(true);
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setShowFeedback(false);
    setQuizComplete(false);
    setFinalScore(0);
    setQuizId(null);
    setShuffledQuestions([]);
    setShuffleMaps([]);
    shuffledIndicesRef.current.clear();
    generateQuiz();
  };


  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: themeStyles.container,
        centerContainer: themeStyles.centerContainer,
        loadingText: {
          marginTop: spacing.xl,
          fontSize: typography.fontSize.base,
          color: colors.textSecondary,
        },
        errorText: themeStyles.errorText,
        topicName: {
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
      }),
    [colors, typography, spacing, borderRadius, themeStyles]
  );

  if (!topic) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Topic not found</Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Show loading spinner before streaming starts
  if (!quizComplete && quizStreaming.isLoading && !quizStreaming.isStreaming) {
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
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (quizComplete) {
    return (
      <QuizResults
        score={finalScore}
        questions={questions}
        userAnswers={userAnswers}
        onRetry={finalScore < 80 ? handleRetry : undefined}
      />
    );
  }

  // Compose current question for display:
  // - Question text: from partialData (streaming typewriter) or shuffled question
  // - Options: ONLY from shuffled question (never raw partial data — avoids visual reordering)
  const shuffledQ = shuffledQuestions[currentQuestionIndex] ?? null;
  const partialQuestions = quizStreaming.partialData.questions || [];
  const partialQ = partialQuestions[currentQuestionIndex];
  const optionsReady = shuffledQ !== null;

  // Build the question object to display
  const currentQuestion: Partial<QuizQuestion> | undefined = optionsReady
    ? shuffledQ // Shuffled — show everything from shuffled data
    : partialQ
      ? { question: partialQ.question } // Streaming — only expose question text (options hidden)
      : undefined;

  if (!currentQuestion) {
    return <LoadingSpinner message="Loading question..." />;
  }

  const isCurrentQuestionComplete = optionsReady && isQuestionComplete(shuffledQ);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.topicName}>{topic.name}</Text>
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
          optionsReady={optionsReady}
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
              pressed && styles.pressed,
            ]}
            onPress={handleNext}
            disabled={isSubmitting}
          >
            <Text style={styles.nextButtonText}>
              {isSubmitting ? 'Submitting...' : currentQuestionIndex < 3 ? 'Next Question' : 'Complete Quiz'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}