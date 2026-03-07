import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

interface AuthLoadingOverlayProps {
  message?: string;
}

export function AuthLoadingOverlay({ message = 'Authenticating...' }: AuthLoadingOverlayProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: `${colors.background}CC`,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
        },
        content: {
          backgroundColor: colors.cardBackground,
          borderRadius: borderRadius.lg,
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
    [colors, spacing, typography, borderRadius],
  );

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}
