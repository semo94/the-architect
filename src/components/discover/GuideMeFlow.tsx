import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import categorySchema from "../../constants/categories";
import llmService from "../../services/llmService";
import { useAppStore } from "../../store/useAppStore";
import { Technology } from "../../types";
import { hasMinimumData, parseStreamingJson } from "../../utils/streamingParser";
import { useStreamingData } from "../../hooks/useStreamingData";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ActionButtons } from "./ActionButtons";
import { StreamingQuestionCard } from "./StreamingQuestionCard";
import { StreamingTechnologyCard } from "./StreamingTechnologyCard";
import { TechnologyCard } from "./TechnologyCard";
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  onComplete: () => void;
}

interface ConversationStep {
  question: string;
  answer: string;
}

export const GuideMeFlow: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<
    ConversationStep[]
  >([]);
  const [currentQuestion, setCurrentQuestion] = useState<{
    question: string;
    options: string[];
  } | null>(null);
  const [technology, setTechnology] = useState<Technology | null>(null);
  const [loading, setLoading] = useState(false);
  const [partialData, setPartialData] = useState<Partial<Technology>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, styles: themeStyles } = useTheme();

  const { technologies, addTechnology, dismissTechnology } = useAppStore();

  // Streaming state for questions
  const questionStreaming = useStreamingData<{ question: string; options: string[] }>({
    hasMinimumData: (data) => !!data.question,
  });

  // Destructure streaming functions for proper dependency tracking
  const { onProgress, handleComplete, handleError, reset } = questionStreaming;

  const styles = useMemo(() => StyleSheet.create({
    container: themeStyles.container,
    centerContainer: themeStyles.centerContainer,
    errorText: {
      ...themeStyles.errorText,
      marginBottom: spacing.xl,
    },
    retryButton: {
      ...themeStyles.button,
      ...themeStyles.buttonPrimary,
    },
    pressed: themeStyles.pressed,
    retryButtonText: themeStyles.buttonText,
    header: {
      ...themeStyles.header,
      paddingTop: spacing.xl, // Will be overridden by inline style with safe area
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      flexGrow: 1,
    },
    stepIndicator: {
      fontSize: typography.fontSize.base,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      fontWeight: typography.fontWeight.semibold,
    },
    progressBar: themeStyles.progressBar,
    progressFill: themeStyles.progressFill,
    historyContainer: {
      padding: spacing.xl,
      marginTop: spacing.md,
    },
    historyTitle: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      fontWeight: typography.fontWeight.semibold,
    },
    historyItem: {
      marginBottom: spacing.sm,
    },
    historyAnswer: {
      fontSize: typography.fontSize.sm,
      color: colors.primary,
      fontWeight: typography.fontWeight.medium,
    },
    footer: themeStyles.footer,
    cancelButton: {
      paddingVertical: spacing.md,
      alignItems: "center",
      cursor: "pointer" as any,
    },
    cancelButtonText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
    },
  }), [colors, typography, spacing, themeStyles]);

  const generateFirstQuestion = useCallback(async () => {
    setError(null);
    reset(); // This sets isLoading=true internally

    try {
      const question = await llmService.generateGuidedQuestion(
        1,
        [],
        categorySchema,
        onProgress
      );
      setCurrentQuestion(question);
      handleComplete(question);
    } catch (err) {
      setError("Failed to generate question. Please try again.");
      console.error(err);
      handleError(err as Error);
    }
  }, [onProgress, handleComplete, reset, handleError]);

  useEffect(() => {
    generateFirstQuestion();
  }, [generateFirstQuestion]);

  const handleOptionSelect = async (option: string) => {
    if (!currentQuestion) return;

    const newHistory = [
      ...conversationHistory,
      { question: currentQuestion.question, answer: option },
    ];
    setConversationHistory(newHistory);

    if (step < 2) {
      // Generate next question
      questionStreaming.reset(); // This sets isLoading=true internally
      try {
        const nextQuestion = await llmService.generateGuidedQuestion(
          step + 2,
          newHistory,
          categorySchema,
          questionStreaming.onProgress
        );
        setCurrentQuestion(nextQuestion);
        questionStreaming.handleComplete(nextQuestion);
        setStep(step + 1);
      } catch (err) {
        setError("Failed to generate next question. Please try again.");
        console.error(err);
        questionStreaming.handleError(err as Error);
      }
    } else {
      // Generate final technology
      generateFinalTechnology(newHistory);
    }
  };

  const generateFinalTechnology = async (history: ConversationStep[]) => {
    setLoading(true);
    setPartialData({});
    setIsStreaming(false);
    setError(null);

    try {
      const alreadyDiscovered = technologies.map((t) => t.name);

      const newTechnology = await llmService.generateGuidedTechnology(
        history,
        alreadyDiscovered,
        categorySchema,
        (partialText) => {
          // Parse the streaming JSON progressively
          const parsed = parseStreamingJson(partialText);
          setPartialData(parsed);

          // Once we have minimum data, show the streaming card
          if (hasMinimumData(parsed)) {
            setIsStreaming(true);
            setLoading(false);
          }
        }
      );

      setTechnology(newTechnology);
      setCurrentQuestion(null);
      setIsStreaming(false); // Stop streaming, show final card
    } catch (err) {
      setError("Failed to generate technology. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    if (technology) {
      dismissTechnology(technology.name);
    }
    onComplete();
  };

  const handleAddToBucket = () => {
    if (technology) {
      addTechnology(technology);
    }
    onComplete();
  };

  const handleAcquireNow = () => {
    if (technology) {
      addTechnology(technology);
      router.push({
        pathname: "/quiz",
        params: { technologyId: technology.id },
      });
    }
  };

  // Show loading spinner before any streaming data arrives
  if (questionStreaming.isLoading && !questionStreaming.isStreaming) {
    return <LoadingSpinner message="Preparing question..." />;
  }

  if (loading) {
    return (
      <LoadingSpinner
        message={
          technology
            ? "Finding the perfect technology for you..."
            : "Generating your personalized learning path..."
        }
      />
    );
  }

  // Show streaming card while content is being generated
  if (isStreaming && !technology) {
    return (
      <View style={styles.container}>
        <StreamingTechnologyCard partialData={partialData} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
          ]}
          onPress={onComplete}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Show technology card if generation is complete
  if (technology) {
    return (
      <View style={styles.container}>
        <TechnologyCard technology={technology} />
        <ActionButtons
          onDismiss={handleDismiss}
          onAddToBucket={handleAddToBucket}
          onAcquireNow={handleAcquireNow}
        />
      </View>
    );
  }

  // Show question and options (with streaming support)
  if (currentQuestion || questionStreaming.isStreaming) {
    const displayData = questionStreaming.isStreaming || questionStreaming.isLoading
      ? questionStreaming.partialData
      : currentQuestion;
    const isComplete = !!questionStreaming.finalData;

    return (
      <View style={styles.container}>
        {/* Fixed Header with Progress Bar */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <Text style={styles.stepIndicator}>Step {step + 1} of 3</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((step + 1) / 3) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <StreamingQuestionCard
            partialData={displayData || {}}
            isStreaming={questionStreaming.isStreaming}
            isComplete={isComplete}
            onSelectOption={handleOptionSelect}
          />

          {conversationHistory.length > 0 && (
            <View style={styles.historyContainer}>
              <Text style={styles.historyTitle}>Your selections:</Text>
              {conversationHistory.map((item, index) => (
                <View key={index} style={styles.historyItem}>
                  <Text style={styles.historyAnswer}>✓ {item.answer}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
            onPress={onComplete}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return null;
};
