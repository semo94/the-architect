import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const { colors, shadows, spacing, borderRadius } = useTheme();

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      ...shadows.small,
    },
  });

  return <View style={[styles.card, style]}>{children}</View>;
};
