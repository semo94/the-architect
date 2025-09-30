import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
} from 'react-native';

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
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  pressed: {
    opacity: 0.7,
  },
  dismissButton: {
    backgroundColor: '#f5f5f5',
  },
  bucketButton: {
    backgroundColor: '#2196F3',
  },
  acquireButton: {
    backgroundColor: '#4CAF50',
  },
  dismissIcon: {
    fontSize: 24,
    color: '#666',
  },
  dismissText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  bucketIcon: {
    fontSize: 24,
  },
  bucketText: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
  },
  acquireIcon: {
    fontSize: 24,
  },
  acquireText: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
  },
});