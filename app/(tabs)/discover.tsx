import { Card } from '@/components/common/Card';
import { AppBrandHeader } from '@/components/layout/AppBrandHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, typography, spacing, borderRadius, styles: themeStyles } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: themeStyles.container,
    touchable: themeStyles.touchable,
    pressed: themeStyles.pressed,

    // ── Hero ──────────────────────────────────────────────────────────────
    heroBlock: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    heroTitle: {
      fontSize: typography.fontSize.xxl,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      lineHeight: typography.lineHeight.extraLoose,
      marginBottom: spacing.xs,
    },
    heroSubtitle: {
      fontSize: typography.fontSize.base,
      color: colors.textSecondary,
    },

    // ── Mode cards ────────────────────────────────────────────────────────
    cardWrapper: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
    },
    modeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.xl,
      overflow: 'hidden',
    },
    surpriseBorder: {
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    guideBorder: {
      borderLeftWidth: 4,
      borderLeftColor: colors.secondary,
    },
    iconContainer: {
      width: 52,
      height: 52,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.lg,
    },
    surpriseIconBg: {
      backgroundColor: colors.primaryLight,
    },
    guideIconBg: {
      backgroundColor: colors.secondaryLight,
    },
    modeContent: {
      flex: 1,
    },
    modeTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    modeDescription: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: typography.lineHeight.normal,
    },
    chevron: {
      marginLeft: spacing.sm,
    },

    // ── Pro Tip ───────────────────────────────────────────────────────────
    tipContainer: {
      marginHorizontal: spacing.xl,
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
      padding: spacing.lg,
      backgroundColor: colors.primaryLight,
      borderRadius: borderRadius.md,
    },
    tipTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    tipTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.primaryDark,
      marginLeft: spacing.xs,
    },
    tipText: {
      fontSize: typography.fontSize.sm,
      color: colors.primaryDark,
      lineHeight: typography.lineHeight.normal,
    },
  }), [colors, typography, spacing, borderRadius, themeStyles]);

  const handleSurpriseMe = () => {
    router.push('/discover-surprise');
  };

  const handleGuideMe = () => {
    router.push('/discover-guided');
  };

  return (
    <ScrollView style={styles.container}>
      <AppBrandHeader paddingTop={Math.max(insets.top, spacing.xl)} />

      <View style={styles.heroBlock}>
        <Text style={styles.heroTitle}>What will you{'\n'}discover today?</Text>
        <Text style={styles.heroSubtitle}>Choose your exploration mode</Text>
      </View>

      <Pressable onPress={handleSurpriseMe} style={({ pressed }) => [styles.touchable, pressed && styles.pressed]}>
        <View style={styles.cardWrapper}>
          <Card style={[styles.modeCard, styles.surpriseBorder]}>
            <View style={[styles.iconContainer, styles.surpriseIconBg]}>
              <Ionicons name="dice-outline" size={28} color={colors.primary} />
            </View>
            <View style={styles.modeContent}>
              <Text style={styles.modeTitle}>Surprise Me</Text>
              <Text style={styles.modeDescription}>
                Discover a random topic you haven&apos;t learned yet
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} style={styles.chevron} />
          </Card>
        </View>
      </Pressable>

      <Pressable onPress={handleGuideMe} style={({ pressed }) => [styles.touchable, pressed && styles.pressed]}>
        <View style={styles.cardWrapper}>
          <Card style={[styles.modeCard, styles.guideBorder]}>
            <View style={[styles.iconContainer, styles.guideIconBg]}>
              <Ionicons name="compass-outline" size={28} color={colors.secondary} />
            </View>
            <View style={styles.modeContent}>
              <Text style={styles.modeTitle}>Guide Me</Text>
              <Text style={styles.modeDescription}>
                Answer a few questions to find relevant topics
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} style={styles.chevron} />
          </Card>
        </View>
      </Pressable>

      <View style={styles.tipContainer}>
        <View style={styles.tipTitleRow}>
          <Ionicons name="bulb-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.tipTitle}>Pro Tip</Text>
        </View>
        <Text style={styles.tipText}>
          Aim to discover 3-5 new topics each week to steadily expand your architectural breadth
        </Text>
      </View>
    </ScrollView>
  );
}
