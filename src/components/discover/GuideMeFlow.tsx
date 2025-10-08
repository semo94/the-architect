import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
import { hasMinimumData, parseStreamingJson } from "../../utils/streamingJsonParser";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ActionButtons } from "./ActionButtons";
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
  const { colors, typography, spacing, borderRadius, styles: themeStyles } = useTheme();

  const { technologies, addTechnology, dismissTechnology } = useAppStore();

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
    questionContainer: {
      padding: spacing.xl,
      backgroundColor: colors.cardBackground,
      marginTop: spacing.lg,
      marginHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
      alignItems: "center",
    },
    questionIcon: {
      fontSize: typography.fontSize.massive,
      marginBottom: spacing.lg,
    },
    questionText: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      textAlign: "center",
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
      textAlign: "center",
    },
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
  }), [colors, typography, spacing, borderRadius, themeStyles]);

  useEffect(() => {
    generateFirstQuestion();
  }, []);

  const generateFirstQuestion = async () => {
    setLoading(true);
    setError(null);

    try {
      const question = await llmService.generateGuidedQuestion(
        1,
        [],
        categorySchema
      );
      setCurrentQuestion(question);
    } catch (err) {
      setError("Failed to generate question. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = async (option: string) => {
    if (!currentQuestion) return;

    const newHistory = [
      ...conversationHistory,
      { question: currentQuestion.question, answer: option },
    ];
    setConversationHistory(newHistory);

    if (step < 2) {
      // Generate next question
      setLoading(true);
      try {
        const nextQuestion = await llmService.generateGuidedQuestion(
          step + 2,
          newHistory,
          categorySchema
        );
        setCurrentQuestion(nextQuestion);
        setStep(step + 1);
      } catch (err) {
        setError("Failed to generate next question. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
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

  if (loading) {
    return (
      <LoadingSpinner
        message={
          technology
            ? "Finding the perfect technology for you..."
            : "Preparing question..."
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

  // Show question and options
  if (currentQuestion) {
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
          <View style={styles.questionContainer}>
            <Text style={styles.questionIcon}>🧭</Text>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
          </View>

          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.optionButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleOptionSelect(option)}
              >
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            ))}
          </View>

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
