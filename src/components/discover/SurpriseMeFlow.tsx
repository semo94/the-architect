import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import categorySchema from '../../constants/categories';
import llmService from '../../services/llmService';
import { useAppStore } from '../../store/useAppStore';
import { Technology } from '../../types';
import { hasMinimumData, parseStreamingJson } from '../../utils/streamingParser';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ActionButtons } from './ActionButtons';
import { TechnologyCard } from './TechnologyCard';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  onComplete: () => void;
}

export const SurpriseMeFlow: React.FC<Props> = ({ onComplete }) => {
  const [technology, setTechnology] = useState<Technology | null>(null);
  const [loading, setLoading] = useState(true);
  const [partialData, setPartialData] = useState<Partial<Technology>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles } = useTheme();

  const {
    technologies,
    dismissedTechnologies,
    addTechnology,
    dismissTechnology
  } = useAppStore();

  useEffect(() => {
    generateSurpriseTechnology();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateSurpriseTechnology = async () => {
    setLoading(true);
    setPartialData({});
    setIsStreaming(false);
    setError(null);

    try {
      const alreadyDiscovered = technologies.map(t => t.name);

      const newTechnology = await llmService.generateSurpriseTechnology(
        alreadyDiscovered,
        dismissedTechnologies,
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
      setIsStreaming(false); // Stop streaming, show final card
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
      // Navigate to quiz using expo-router
      router.push({
        pathname: '/quiz',
        params: { technologyId: technology.id }
      });
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: themeStyles.container,
    centerContainer: themeStyles.centerContainer,
    errorText: themeStyles.errorText,
    retryButton: {
      ...themeStyles.button,
      ...themeStyles.buttonPrimary,
    },
    pressed: themeStyles.pressed,
    retryButtonText: themeStyles.buttonText,
  }), [themeStyles]);

  if (loading) {
    return <LoadingSpinner message="Finding something exciting for you..." />;
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

  // Show card - either streaming or final state
  if (!isStreaming && !technology) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TechnologyCard
        technology={technology || partialData}
        isComplete={!!technology}
      />
      {technology && (
        <ActionButtons
          onDismiss={handleDismiss}
          onAddToBucket={handleAddToBucket}
          onAcquireNow={handleAcquireNow}
        />
      )}
    </View>
  );
};