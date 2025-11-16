import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { LightColors, DarkColors, spacing, typography, borderRadius } from '@/styles/globalStyles';

export function LogoutButton() {
  const { theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;
  const styles = useStyles(colors);
  const router = useRouter();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleLogout}
      disabled={isLoggingOut}
      accessible={true}
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

const useStyles = (colors: typeof LightColors) => {
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
          minHeight: 48,
          justifyContent: 'center',
        },
        buttonText: {
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          color: '#FFFFFF',
        },
      }),
    [colors]
  );
};
