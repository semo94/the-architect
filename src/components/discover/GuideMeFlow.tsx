import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import claudeService from '../../services/claudeService';
import { TechnologyCard } from './TechnologyCard';
import { ActionButtons } from './ActionButtons';
import { Technology } from '../../types';
import categorySchema from '../../constants/categories';

interface Props {
  onComplete: () => void;
}

interface ConversationStep {
  question: string;
  answer: string;
}

export const GuideMeFlow: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<ConversationStep[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<{ question: string; options: string[] } | null>(null);
  const [technology, setTechnology] = useState<Technology | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { technologies, addTechnology, dismissTechnology } = useAppStore();

  useEffect(() => {
    generateFirstQuestion();
  }, []);

  const generateFirstQuestion = async () => {
    setLoading(true);
    setError(null);

    try {
      const question = await claudeService.generateGuidedQuestion(
        1,
        [],
        categorySchema
      );
      setCurrentQuestion(question);
    } catch (err) {
      setError('Failed to generate question. Please try again.');
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
        const nextQuestion = await claudeService.generateGuidedQuestion(
          step + 2,
          newHistory,
          categorySchema
        );
        setCurrentQuestion(nextQuestion);
        setStep(step + 1);
      } catch (err) {
        setError('Failed to generate next question. Please try again.');
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
    setError(null);

    try {
      const alreadyDiscovered = technologies.map((t) => t.name);

      const newTechnology = await claudeService.generateGuidedTechnology(
        history,
        alreadyDiscovered,
        categorySchema
      );

      setTechnology(newTechnology);
      setCurrentQuestion(null);
    } catch (err) {
      setError('Failed to generate technology. Please try again.');
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
        pathname: '/quiz',
        params: { technologyId: technology.id }
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>
          {technology ? 'Finding the perfect technology for you...' : 'Preparing question...'}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onComplete}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
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
        <ScrollView style={styles.content}>
          <View style={styles.header}>
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

          <View style={styles.questionContainer}>
            <Text style={styles.questionIcon}>🧭</Text>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
          </View>

          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => handleOptionSelect(option)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
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
          <TouchableOpacity style={styles.cancelButton} onPress={onComplete}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
};

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
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stepIndicator: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    fontWeight: '600',
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
  questionContainer: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 15,
    marginHorizontal: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  questionIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 28,
  },
  optionsContainer: {
    padding: 15,
  },
  optionButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  historyContainer: {
    padding: 20,
    marginTop: 10,
  },
  historyTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontWeight: '600',
  },
  historyItem: {
    marginBottom: 8,
  },
  historyAnswer: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  footer: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});