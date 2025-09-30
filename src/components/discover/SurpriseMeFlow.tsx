import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
} from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import claudeService from '../../services/claudeService';
import { TechnologyCard } from './TechnologyCard';
import { ActionButtons } from './ActionButtons';
import { Technology } from '../../types';
import categorySchema from '../../constants/categories';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useRouter } from 'expo-router';

interface Props {
  onComplete: () => void;
}

export const SurpriseMeFlow: React.FC<Props> = ({ onComplete }) => {
  const [technology, setTechnology] = useState<Technology | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    technologies,
    dismissedTechnologies,
    addTechnology,
    dismissTechnology
  } = useAppStore();

  useEffect(() => {
    generateSurpriseTechnology();
  }, []);

  const generateSurpriseTechnology = async () => {
    setLoading(true);
    setError(null);

    try {
      const alreadyDiscovered = technologies.map(t => t.name);

      const newTechnology = await claudeService.generateSurpriseTechnology(
        alreadyDiscovered,
        dismissedTechnologies,
        categorySchema
      );

      setTechnology(newTechnology);
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

  if (loading) {
    return <LoadingSpinner message="Finding something exciting for you..." />;
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!technology) {
    return null;
  }

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
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
});