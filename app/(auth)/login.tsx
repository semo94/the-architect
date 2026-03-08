import { AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const { colors, spacing } = useTheme();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { isAuthenticated, isAuthLoading, authError, login, setAuthError } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      router.replace('/(tabs)/discover');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => setAuthError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [authError, setAuthError]);

  const containerWidth = width >= 768 ? 500 : width - spacing.xl * 2;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.title}>Breadthwise</Text>
          <Text style={styles.subtitle}>
            Expand your knowledge breadth.{"\n"}
            Discover topics outside your expertise.
          </Text>
        </View>

        <View style={[styles.buttonContainer, { width: containerWidth }]}>
          <TouchableOpacity
            style={styles.githubButton}
            onPress={login}
            disabled={isAuthLoading}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Login with GitHub"
            accessibilityHint="Opens GitHub login in browser"
            accessibilityState={{ disabled: isAuthLoading }}
          >
            {isAuthLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <AntDesign name="github" size={24} color={colors.text} />
                <Text style={styles.githubButtonText}>Continue with GitHub</Text>
              </>
            )}
          </TouchableOpacity>

          {authError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service{"\n"}
            and Privacy Policy.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function useStyles() {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  return React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        content: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
        },
        logoContainer: {
          alignItems: 'center',
          marginBottom: spacing.xxl * 2,
        },
        title: {
          fontSize: typography.fontSize.xxxl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          marginBottom: spacing.md,
          textAlign: 'center',
        },
        subtitle: {
          fontSize: typography.fontSize.base,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: typography.lineHeight.relaxed,
          paddingHorizontal: spacing.xl,
        },
        buttonContainer: {
          width: '100%',
          maxWidth: 400,
        },
        githubButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.cardBackground,
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          minHeight: 56,
          ...shadows.small,
        },
        githubButtonText: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text,
          marginLeft: spacing.md,
        },
        errorContainer: {
          marginTop: spacing.lg,
          backgroundColor: colors.errorLight,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          borderLeftWidth: 4,
          borderLeftColor: colors.error,
        },
        errorText: {
          fontSize: typography.fontSize.sm,
          color: colors.error,
          textAlign: 'center',
        },
        footer: {
          position: 'absolute',
          bottom: spacing.xl,
          paddingHorizontal: spacing.xl,
        },
        footerText: {
          fontSize: typography.fontSize.xs,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: typography.lineHeight.tight,
        },
      }),
    [colors, spacing, typography, borderRadius, shadows],
  );
}
