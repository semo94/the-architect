import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { Colors, Typography, Spacing, BorderRadius, CommonStyles } from '@/styles/globalStyles';

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

  const { technologies, addTechnology, dismissTechnology } = useAppStore();

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

const styles = StyleSheet.create({
  container: CommonStyles.container,
  centerContainer: CommonStyles.centerContainer,
  errorText: {
    ...CommonStyles.errorText,
    marginBottom: Spacing.xl,
  },
  retryButton: {
    ...CommonStyles.button,
    ...CommonStyles.buttonPrimary,
  },
  pressed: CommonStyles.pressed,
  retryButtonText: CommonStyles.buttonText,
  header: {
    ...CommonStyles.header,
    paddingTop: Spacing.xl, // Will be overridden by inline style with safe area
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  stepIndicator: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginBottom: 10,
    fontWeight: Typography.fontWeight.semibold,
  },
  progressBar: CommonStyles.progressBar,
  progressFill: CommonStyles.progressFill,
  questionContainer: {
    padding: Spacing.xl,
    backgroundColor: Colors.white,
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  questionIcon: {
    fontSize: Typography.fontSize.massive,
    marginBottom: Spacing.lg,
  },
  questionText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    textAlign: "center",
    lineHeight: Typography.lineHeight.extraLoose,
  },
  optionsContainer: {
    padding: Spacing.lg,
  },
  optionButton: {
    ...CommonStyles.optionButton,
    padding: Spacing.xl,
  },
  optionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
    textAlign: "center",
  },
  historyContainer: {
    padding: Spacing.xl,
    marginTop: 10,
  },
  historyTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 10,
    fontWeight: Typography.fontWeight.semibold,
  },
  historyItem: {
    marginBottom: Spacing.sm,
  },
  historyAnswer: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  footer: CommonStyles.footer,
  cancelButton: {
    paddingVertical: Spacing.md,
    alignItems: "center",
    cursor: "pointer" as any,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});
