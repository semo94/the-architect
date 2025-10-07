import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, CommonStyles } from '@/styles/globalStyles';

interface Props {
  onDismiss: () => void;
  onAddToBucket: () => void;
  onAcquireNow: () => void;
}

export const ActionButtons: React.FC<Props> = ({ onDismiss, onAddToBucket, onAcquireNow }) => {
  return (
    <View style={styles.container}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginHorizontal: 5,
    borderRadius: BorderRadius.md,
    cursor: 'pointer' as any,
  },
  pressed: CommonStyles.pressed,
  dismissButton: {
    backgroundColor: Colors.background,
  },
  bucketButton: {
    backgroundColor: Colors.secondary,
  },
  acquireButton: {
    backgroundColor: Colors.primary,
  },
  dismissIcon: {
    fontSize: Typography.fontSize.xxl,
    color: Colors.textSecondary,
  },
  dismissText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  bucketIcon: {
    fontSize: Typography.fontSize.xxl,
  },
  bucketText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.white,
    marginTop: 4,
  },
  acquireIcon: {
    fontSize: Typography.fontSize.xxl,
  },
  acquireText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.white,
    marginTop: 4,
  },
});