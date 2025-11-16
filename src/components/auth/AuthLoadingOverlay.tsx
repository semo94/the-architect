import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LightColors, DarkColors, spacing, typography } from '@/styles/globalStyles';

interface AuthLoadingOverlayProps {
  message?: string;
}

export function AuthLoadingOverlay({ message = 'Authenticating...' }: AuthLoadingOverlayProps) {
  const { theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;
  const styles = useStyles(colors);

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const useStyles = (colors: typeof LightColors) => {
  return React.useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.background + 'CC', // 80% opacity
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
        },
        content: {
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: spacing.xxl,
          alignItems: 'center',
          minWidth: 200,
        },
        message: {
          fontSize: typography.fontSize.base,
          color: colors.text,
          marginTop: spacing.lg,
          textAlign: 'center',
        },
      }),
    [colors]
  );
};
