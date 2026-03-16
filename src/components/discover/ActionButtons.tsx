import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bucketButton: {
      backgroundColor: colors.secondary,
    },
    acquireButton: {
      backgroundColor: colors.primary,
    },
    dismissText: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    bucketText: {
      fontSize: typography.fontSize.xs,
      color: colors.white,
      marginTop: spacing.xs,
    },
    acquireText: {
      fontSize: typography.fontSize.xs,
      color: colors.onPrimary,
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
          <Ionicons name="close" size={24} color={colors.textSecondary} />
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
          <Ionicons name="list-outline" size={24} color={colors.white} />
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
          <Ionicons name="checkmark-done-outline" size={24} color={colors.onPrimary} />
          <Text style={styles.acquireText}>Acquire Now</Text>
        </Pressable>
      )}
    </View>
  );
};