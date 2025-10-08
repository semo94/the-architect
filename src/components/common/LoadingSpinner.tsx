import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLoadingStyles } from '@/hooks/useComponentStyles';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  const { colors } = useTheme();
  const styles = useLoadingStyles();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};
