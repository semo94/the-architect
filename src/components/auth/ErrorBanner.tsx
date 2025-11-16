import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { LightColors, DarkColors, spacing, typography, borderRadius } from '@/styles/globalStyles';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

export function ErrorBanner({
  message,
  onDismiss,
  autoDismiss = true,
  autoDismissDelay = 5000,
}: ErrorBannerProps) {
  const { theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;
  const styles = useStyles(colors);

  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(onDismiss, autoDismissDelay);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AntDesign name="exclamationcircle" size={20} color={colors.error} />
        <Text style={styles.message}>{message}</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <AntDesign name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const useStyles = (colors: typeof LightColors) => {
  return React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        },
        content: {
          backgroundColor: colors.errorBackground,
          borderBottomWidth: 2,
          borderBottomColor: colors.error,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        message: {
          flex: 1,
          fontSize: typography.fontSize.sm,
          color: colors.error,
        },
      }),
    [colors]
  );
};
