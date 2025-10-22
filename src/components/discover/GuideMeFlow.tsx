import { useTheme } from '@/contexts/ThemeContext';
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
import { Topic, TopicType } from "../../types";
import { GuideMeHelper, GuideQuestion } from "../../utils/guideMeHelper";
import { hasMinimumData, parseStreamingJson } from "../../utils/streamingParser";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ActionButtons } from "./ActionButtons";
import { TopicCard } from "./TopicCard";

interface Props {
  onComplete: () => void;
}

export const GuideMeFlow: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState({
    category: '',
    subcategory: '',
    topicType: '' as TopicType | '',
    learningGoal: ''
  });
  const [currentQuestion, setCurrentQuestion] = useState<GuideQuestion | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(false);
  const [partialData, setPartialData] = useState<Partial<Topic>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, styles: themeStyles } = useTheme();
  const { topics, addTopic, dismissTopic } = useAppStore();

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
  }), [colors, typography, spacing, themeStyles]);

  useEffect(() => {
    // Load first question immediately (no LLM call)
    setCurrentQuestion(GuideMeHelper.getStep1Question());
  }, []);

  const handleOptionSelect = async (option: string) => {
    if (!currentQuestion) return;
    if (loading) return; // Prevent multiple topic generations

    if (step === 0) {
      // Step 1: Category selected
      setSelections({ ...selections, category: option });
      setCurrentQuestion(GuideMeHelper.getStep2Question(option));
      setStep(1);

    } else if (step === 1) {
      // Step 2: Subcategory selected
      setSelections({ ...selections, subcategory: option });

      // Check if this subcategory has multiple topic types
      const nextQuestion = GuideMeHelper.getStep3Question(selections.category, option);

      if (nextQuestion === null) {
        // Only one topic type - auto-select it and move to step 4
        const singleType = GuideMeHelper.getSingleTopicType(selections.category, option);
        if (singleType) {
          setSelections(prev => ({ ...prev, subcategory: option, topicType: singleType }));
          setCurrentQuestion(GuideMeHelper.getStep4Question(selections.category, option, singleType));
          setStep(3);  // Skip to step 3 (which is learning goal)
        }
      } else {
        // Multiple topic types - show selection
        setCurrentQuestion(nextQuestion);
        setStep(2);
      }

    } else if (step === 2) {
      // Step 3: Topic type selected (only shown if multiple types)
      setSelections({ ...selections, topicType: option as TopicType });
      setCurrentQuestion(GuideMeHelper.getStep4Question(
        selections.category,
        selections.subcategory,
        option as TopicType
      ));
      setStep(3);

    } else if (step === 3) {
      // Step 4: Learning goal selected - generate topic
      setSelections({ ...selections, learningGoal: option });
      await generateFinalTopic(option);
    }
  };

  const generateFinalTopic = async (learningGoal: string) => {
    setLoading(true);
    setPartialData({});
    setIsStreaming(false);
    setError(null);
    setCurrentQuestion(null); // Clear question immediately to hide UI

    try {
      // Build constraints for the unified generateTopic method
      const constraints = {
        category: selections.category,
        subcategory: selections.subcategory,
        topicType: selections.topicType as TopicType,
        learningGoal
      };

      const alreadyDiscovered = topics.map((t) => t.name);

      const newTopic = await llmService.generateTopic(
        'guided',
        alreadyDiscovered,
        [], // No dismissed list for guided mode
        categorySchema,
        constraints,
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

      setTopic(newTopic);
      setIsStreaming(false); // Stop streaming, show final card
    } catch (err) {
      setError("Failed to generate topic. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    if (topic) {
      dismissTopic(topic.name);
    }
    onComplete();
  };

  const handleAddToBucket = () => {
    if (topic) {
      addTopic(topic);
    }
    onComplete();
  };

  const handleAcquireNow = () => {
    if (topic) {
      addTopic(topic);
      router.push({
        pathname: "/quiz",
        params: { topicId: topic.id },
      });
    }
  };

  if (loading) {
    return (
      <LoadingSpinner
        message="Finding the perfect topic for you..."
      />
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

  // Show topic card if generation is started or complete
  if (topic || (isStreaming && !currentQuestion)) {
    return (
      <View style={styles.container}>
        <TopicCard
          topic={topic || partialData}
          isComplete={!!topic}
        />
        {topic && (
          <ActionButtons
            onDismiss={handleDismiss}
            onAddToBucket={handleAddToBucket}
            onAcquireNow={handleAcquireNow}
          />
        )}
      </View>
    );
  }

  // Show question and options
  if (currentQuestion) {
    // Calculate total steps (3 or 4 depending on whether topic type selection is needed)
    const totalSteps = selections.subcategory &&
      GuideMeHelper.getStep3Question(selections.category, selections.subcategory) === null
      ? 3 : 4;

    return (
      <View style={styles.container}>
        {/* Fixed Header with Progress Bar */}
        <View style={[styles.header]}>
          <Text style={styles.stepIndicator}>Step {step + 1} of {totalSteps}</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((step + 1) / totalSteps) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={{ padding: spacing.xl }}>
            <Text style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text,
              marginBottom: spacing.xl
            }}>
              {currentQuestion.question}
            </Text>

            {currentQuestion.options.map((option, index) => (
              <Pressable
                key={index}
                onPress={() => handleOptionSelect(option.value)}
                style={({ pressed }) => [
                  {
                    backgroundColor: pressed ? colors.primaryLight : colors.cardBackground,
                    padding: spacing.lg,
                    borderRadius: 12,
                    marginBottom: spacing.md,
                    borderWidth: 1,
                    borderColor: colors.border
                  }
                ]}
              >
                <Text style={{
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text,
                  marginBottom: option.description ? spacing.xs : 0
                }}>
                  {option.label}
                </Text>
                {option.description && (
                  <Text style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.textSecondary
                  }}>
                    {option.description}
                  </Text>
                )}
              </Pressable>
            ))}

            {/* Show selections history */}
            {step > 0 && (
              <View style={{ marginTop: spacing.xl }}>
                <Text style={styles.historyTitle}>Your selections:</Text>
                {selections.category && (
                  <Text style={styles.historyAnswer}>✓ {selections.category}</Text>
                )}
                {selections.subcategory && (
                  <Text style={styles.historyAnswer}>✓ {selections.subcategory}</Text>
                )}
                {selections.topicType && (
                  <Text style={styles.historyAnswer}>✓ {selections.topicType}</Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return null;
};
