import { useRouter, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { TechnologyCard } from '@/components/discover/TechnologyCard';
import { ActionButtons } from '@/components/discover/ActionButtons';
import { useTheme } from '@/contexts/ThemeContext';

export default function TechnologyDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { technologies } = useAppStore();

  const technologyId = params.technologyId as string;
  const technology = technologies.find(t => t.id === technologyId);

  const handleAcquireNow = () => {
    if (!technology) return;

    // Navigate to quiz screen
    // Technology will be marked as 'learned' only after passing the quiz (score >= 80%)
    router.push({
      pathname: '/quiz',
      params: { technologyId: technology.id }
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  if (!technology) {
    // Handle case where technology doesn't exist
    Alert.alert('Error', 'Technology not found', [
      { text: 'OK', onPress: () => router.back() }
    ]);
    return null;
  }

  return (
    <View style={styles.container}>
      <TechnologyCard
        technology={technology}
        isComplete={true}
      />
      {/* Only show "Acquire Now" button if technology is still in 'discovered' status */}
      {technology.status === 'discovered' && (
        <ActionButtons onAcquireNow={handleAcquireNow} />
      )}
    </View>
  );
}
