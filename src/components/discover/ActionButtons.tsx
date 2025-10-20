import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  onDismiss?: () => void;
  onAddToBucket?: () => void;
  onAcquireNow?: () => void;
}

export const ActionButtons: React.FC<Props> = ({ onDismiss, onAddToBucket, onAcquireNow }) => {
  const { colors, typography, spacing, borderRadius, styles: themeStyles } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      padding: spacing.lg,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    button: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      paddingVertical: spacing.md,
      marginHorizontal: spacing.xs,
      borderRadius: borderRadius.md,
      cursor: 'pointer' as any,
    },
    pressed: themeStyles.pressed,
    dismissButton: {
      backgroundColor: colors.background,
    },
    bucketButton: {
      backgroundColor: colors.secondary,
    },
    acquireButton: {
      backgroundColor: colors.primary,
    },
    dismissIcon: {
      fontSize: typography.fontSize.xxl,
      color: colors.textSecondary,
    },
    dismissText: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    bucketIcon: {
      fontSize: typography.fontSize.xxl,
    },
    bucketText: {
      fontSize: typography.fontSize.xs,
      color: colors.white,
      marginTop: spacing.xs,
    },
    acquireIcon: {
      fontSize: typography.fontSize.xxl,
    },
    acquireText: {
      fontSize: typography.fontSize.xs,
      color: colors.white,
      marginTop: spacing.xs,
    },
  }), [colors, typography, spacing, borderRadius, themeStyles]);

  return (
    <View style={styles.container}>
      {onDismiss && (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.dismissButton,
            pressed && styles.pressed
          ]}
          onPress={onDismiss}
        >
          <Text style={styles.dismissIcon}>✕</Text>
          <Text style={styles.dismissText}>Dismiss</Text>
        </Pressable>
      )}

      {onAddToBucket && (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.bucketButton,
            pressed && styles.pressed
          ]}
          onPress={onAddToBucket}
        >
          <Text style={styles.bucketIcon}>📋</Text>
          <Text style={styles.bucketText}>Add to Bucket</Text>
        </Pressable>
      )}

      {onAcquireNow && (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.acquireButton,
            pressed && styles.pressed
          ]}
          onPress={onAcquireNow}
        >
          <Text style={styles.acquireIcon}>🎯</Text>
          <Text style={styles.acquireText}>Acquire Now</Text>
        </Pressable>
      )}
    </View>
  );
};