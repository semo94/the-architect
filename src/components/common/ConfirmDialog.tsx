import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  destructive?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  destructive = false,
}: ConfirmDialogProps) {
  const styles = useStyles();

  const handleCancel = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable style={styles.dialog} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogMessage}>{message}</Text>

          <View style={styles.dialogActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                destructive ? styles.destructiveButton : styles.confirmButton,
              ]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function useStyles() {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  return React.useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
        },
        dialog: {
          width: '100%',
          maxWidth: 420,
          backgroundColor: colors.cardBackground,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
          ...shadows.medium,
        },
        dialogTitle: {
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          marginBottom: spacing.sm,
        },
        dialogMessage: {
          fontSize: typography.fontSize.base,
          color: colors.textSecondary,
          lineHeight: typography.lineHeight.relaxed,
          marginBottom: spacing.xl,
        },
        dialogActions: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: spacing.sm,
        },
        actionButton: {
          minWidth: 96,
          minHeight: 44,
          borderRadius: borderRadius.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        cancelButton: {
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        },
        cancelButtonText: {
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.medium,
          color: colors.text,
        },
        confirmButton: {
          backgroundColor: colors.primary,
        },
        destructiveButton: {
          backgroundColor: colors.error,
        },
        confirmButtonText: {
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          color: '#FFFFFF',
        },
      }),
    [colors, spacing, typography, borderRadius, shadows],
  );
}
