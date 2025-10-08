import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  const { colors, typography, spacing } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    message: {
      marginTop: spacing.xl,
      fontSize: typography.fontSize.base,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};
