import { useTheme } from '@/contexts/ThemeContext';
import topicService from '@/services/topicService';
import { useAppStore } from '@/store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
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
import { useStreamingData } from "../../hooks/useStreamingData";
import categorySchemaService from '../../services/categorySchemaService';
import { Topic, TopicType } from "../../types";
import { CategorySchemaMap } from '../../types/categorySchema';
import { GuideMeHelper, GuideQuestion } from "../../utils/guideMeHelper";
import { hasMinimumData } from "../../utils/streamingParser";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ActionButtons } from "./ActionButtons";
import { TopicCard } from "./TopicCard";

interface Props {
  onComplete: () => void;
}

export const GuideMeFlow: React.FC<Props> = ({ onComplete }) => {
  const [categorySchema, setCategorySchema] = useState<CategorySchemaMap | null>(null);
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState({
    category: '',
    subcategory: '',
    topicType: '' as TopicType | '',
    learningGoal: ''
  });
  const [currentQuestion, setCurrentQuestion] = useState<GuideQuestion | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, styles: themeStyles } = useTheme();
  const { setTopicDetail, setTopicsNeedRefresh } = useAppStore();

  // Use streaming hook for state management and cleanup
  const topicStreaming = useStreamingData<Topic>({
    hasMinimumData: (data) => hasMinimumData(data),
    onComplete: (completedTopic) => {
      console.log('[GuideMe] Topic generation complete');
      setTopic(completedTopic);
    },
  });

  // Destructure streaming functions to avoid nested object properties in dependencies
  const { onProgress, handleComplete, handleError, reset, cancel } = topicStreaming;

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
    const loadSchema = async () => {
      try {
        const schema = await categorySchemaService.getSchema();
        setCategorySchema(schema);
        setCurrentQuestion(GuideMeHelper.getStep1Question(schema));
      } catch (err) {
        setError('Failed to load discovery schema. Please try again.');
        console.error(err);
      }
    };

    void loadSchema();
  }, []);

  useEffect(() => {
    // Cleanup: cancel streaming when component unmounts
    return () => {
      console.log('[GuideMe] Cleaning up - cancelling stream');
      cancel();
    };
  }, [cancel]);

  const handleOptionSelect = async (option: string) => {
    if (!currentQuestion) return;
    if (!categorySchema) return;
    if (topicStreaming.isLoading) return; // Prevent multiple topic generations

    if (step === 0) {
      // Step 1: Category selected
      setSelections({ ...selections, category: option });
      setCurrentQuestion(GuideMeHelper.getStep2Question(categorySchema, option));
      setStep(1);

    } else if (step === 1) {
      // Step 2: Subcategory selected
      setSelections({ ...selections, subcategory: option });

      // Check if this subcategory has multiple topic types
      const nextQuestion = GuideMeHelper.getStep3Question(categorySchema, selections.category, option);

      if (nextQuestion === null) {
        // Only one topic type - auto-select it and move to step 4
        const singleType = GuideMeHelper.getSingleTopicType(categorySchema, selections.category, option);
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

  const generateFinalTopic = useCallback(async (learningGoal: string) => {
    if (!categorySchema) {
      setError('Discovery schema is not loaded yet. Please try again.');
      return;
    }

    reset(); // This sets isLoading=true internally
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

      const result = await topicService.discoverTopic(
        'guided',
        constraints,
        onProgress
      );

      setTopicId(result.topicId);
      handleComplete(result.topic);
    } catch (err) {
      setError("Failed to generate topic. Please try again.");
      console.error(err);
      handleError(err as Error);
    }
  }, [categorySchema, selections, onProgress, handleComplete, handleError, reset]);

  const handleDismiss = async () => {
    if (topic && topicId) {
      await topicService.updateTopicStatus(topicId, 'dismissed', 'guided');
      setTopicsNeedRefresh(true);
    }
    onComplete();
  };

  const handleAddToBucket = async () => {
    if (topic && topicId) {
      await topicService.updateTopicStatus(topicId, 'discovered', 'guided');
      setTopicsNeedRefresh(true);
    }
    onComplete();
  };

  const handleAcquireNow = async () => {
    if (topic && topicId) {
      await topicService.updateTopicStatus(topicId, 'discovered', 'guided');
      setTopicsNeedRefresh(true);
      setTopicDetail(topic);
      router.replace({
        pathname: "/quiz",
        params: { topicId },
      });
    }
  };

  // Show loading spinner before streaming starts (only during topic generation)
  if (topicStreaming.isLoading && !topicStreaming.isStreaming && !currentQuestion) {
    return (
      <LoadingSpinner
        message="Finding the perfect topic for you..."
      />
    );
  }

  if (!categorySchema && !error) {
    return <LoadingSpinner message="Loading discovery schema..." />;
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
  if (topic || (topicStreaming.isStreaming && !currentQuestion)) {
    return (
      <View style={styles.container}>
        <TopicCard
          topic={topic || topicStreaming.partialData}
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
    const totalSteps = categorySchema && selections.subcategory &&
      GuideMeHelper.getStep3Question(categorySchema, selections.category, selections.subcategory) === null
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
                {selections.category ? (
                  <Text style={styles.historyAnswer}><Ionicons name="checkmark-circle" size={14} color={colors.primary} /> {selections.category}</Text>
                ) : null}
                {selections.subcategory ? (
                  <Text style={styles.historyAnswer}><Ionicons name="checkmark-circle" size={14} color={colors.primary} /> {selections.subcategory}</Text>
                ) : null}
                {selections.topicType ? (
                  <Text style={styles.historyAnswer}><Ionicons name="checkmark-circle" size={14} color={colors.primary} /> {selections.topicType}</Text>
                ) : null}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return null;
};
