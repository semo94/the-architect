import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

export function LogoutButton() {
  const styles = useStyles();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await logout();
          } catch {
            Alert.alert('Error', 'Failed to logout. Please try again.');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleLogout}
      disabled={isLoggingOut}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Logout"
      accessibilityHint="Logout from your account"
      accessibilityState={{ disabled: isLoggingOut }}
    >
      {isLoggingOut ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonText}>Logout</Text>
      )}
    </TouchableOpacity>
  );
}

function useStyles() {
  const { colors, spacing, typography, borderRadius } = useTheme();

  return React.useMemo(
    () =>
      StyleSheet.create({
        button: {
          backgroundColor: colors.error,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          alignItems: 'center',
          marginHorizontal: spacing.lg,
          marginTop: spacing.xl,
          marginBottom: spacing.xxl,
          minHeight: 48,
          justifyContent: 'center',
        },
        buttonText: {
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          color: '#FFFFFF',
        },
      }),
    [colors, spacing, typography, borderRadius],
  );
}
