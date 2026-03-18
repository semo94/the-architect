import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

const FEATURES: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
}[] = [
  {
    icon: 'shuffle-outline',
    title: 'Surprise Me',
    description: 'Random picks across 10+ architecture domains.',
  },
  {
    icon: 'compass-outline',
    title: 'Guide Me',
    description: 'A few questions → a personalised recommendation.',
  },
  {
    icon: 'book-outline',
    title: 'Architect-Focused Content',
    description: 'Trade-offs and comparisons, not just docs.',
  },
  {
    icon: 'bar-chart-outline',
    title: 'Track Your Breadth',
    description: 'Visualise growth and earn milestones.',
  },
];

export function LoginScreen() {
  const { colors, styles: gs } = useTheme();
  const ls = useLocalStyles();
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

  return (
    <SafeAreaView style={gs.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={ls.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={ls.inner}>

          {/* Hero */}
          <View style={ls.hero}>
            <View style={[gs.badge, gs.badgeSuccess, ls.badgePill]}>
              <Text style={[gs.badgeText, ls.badgePillText]}>For Senior Engineers</Text>
            </View>
            <Text style={ls.title}>Breadthwise</Text>
            <Text style={[gs.subtitle, ls.subtitleCentered]}>
              Go from deep specialist to well-rounded architect — one technology at a time.
            </Text>
          </View>

          {/* Feature List */}
          <View style={[gs.card, ls.featureList]}>
            {FEATURES.map((feature) => (
              <View key={feature.title} style={ls.featureItem}>
                <View style={ls.featureIconWrap}>
                  <Ionicons name={feature.icon} size={22} color={colors.primary} />
                </View>
                <View style={ls.featureTextCol}>
                  <Text style={ls.featureTitle}>{feature.title}</Text>
                  <Text style={gs.bodyText}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTA */}
          <View style={ls.ctaSection}>
            <TouchableOpacity
              style={ls.githubButton}
              onPress={login}
              disabled={isAuthLoading}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Login with GitHub"
              accessibilityHint="Opens GitHub login in browser"
              accessibilityState={{ disabled: isAuthLoading }}
              activeOpacity={0.85}
            >
              {isAuthLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <AntDesign name="github" size={24} color={colors.text} />
                  <Text style={ls.githubButtonText}>Continue with GitHub</Text>
                </>
              )}
            </TouchableOpacity>

            {authError && (
              <View style={ls.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={[gs.errorText, ls.errorTextInline]}>{authError}</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <Text style={ls.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function useLocalStyles() {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  return React.useMemo(
    () =>
      StyleSheet.create({
        scrollContent: {
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: spacing.xxl,
          paddingHorizontal: spacing.xl,
        },
        inner: {
          width: '100%',
          maxWidth: 480,
          alignItems: 'stretch',
        },

        // Hero
        hero: {
          alignItems: 'center',
          marginBottom: spacing.xxl,
        },
        badgePill: {
          borderRadius: borderRadius.round,
          marginBottom: spacing.md,
        },
        badgePillText: {
          color: colors.primaryDark,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        title: {
          fontSize: typography.fontSize.massive,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          textAlign: 'center',
          letterSpacing: -0.5,
          marginVertical: spacing.md,
        },
        subtitleCentered: {
          textAlign: 'center',
          paddingHorizontal: spacing.sm,
        },

        // Features — extends gs.card
        featureList: {
          borderRadius: borderRadius.lg,
          padding: 0,
          marginBottom: spacing.xxl,
          overflow: 'hidden',
        },
        featureItem: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.lg,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        featureIconWrap: {
          width: 40,
          height: 40,
          borderRadius: borderRadius.md,
          backgroundColor: colors.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
          flexShrink: 0,
        },
        featureTextCol: {
          flex: 1,
        },
        featureTitle: {
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text,
          marginBottom: spacing.xs,
        },

        // CTA
        ctaSection: {
          marginBottom: spacing.xl,
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
        errorBanner: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginTop: spacing.lg,
          backgroundColor: colors.errorLight,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          borderLeftWidth: 4,
          borderLeftColor: colors.error,
        },
        errorTextInline: {
          flex: 1,
          fontSize: typography.fontSize.sm,
          textAlign: 'left',
        },

        // Footer
        footerText: {
          fontSize: typography.fontSize.xs,
          color: colors.textLight,
          textAlign: 'center',
          lineHeight: typography.lineHeight.tight,
        },
      }),
    [colors, spacing, typography, borderRadius, shadows],
  );
}
