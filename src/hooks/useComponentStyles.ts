import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Optimized hook for card styles - memoized to prevent recreation on each render
 */
export const useCardStyles = () => {
  const { colors, shadows, spacing, borderRadius } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.cardBackground,
          borderRadius: borderRadius.md,
          padding: spacing.lg,
          ...shadows.small,
        },
        cardWithMargin: {
          backgroundColor: colors.cardBackground,
          borderRadius: borderRadius.md,
          padding: spacing.xl,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.lg,
          ...shadows.small,
        },
      }),
    [colors, shadows, spacing, borderRadius]
  );
};

/**
 * Optimized hook for button styles
 */
export const useButtonStyles = () => {
  const { colors, typography, spacing, borderRadius, styles: themeStyles } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        base: {
          paddingHorizontal: spacing.xxl,
          paddingVertical: spacing.md,
          borderRadius: borderRadius.md,
          alignItems: 'center',
          cursor: 'pointer' as any,
        },
        primary: {
          backgroundColor: colors.primary,
        },
        secondary: {
          backgroundColor: colors.secondary,
        },
        error: {
          backgroundColor: colors.error,
        },
        warning: {
          backgroundColor: colors.warning,
        },
        text: {
          color: colors.white,
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
        },
        pressed: themeStyles.pressed,
      }),
    [colors, typography, spacing, borderRadius, themeStyles]
  );
};

/**
 * Optimized hook for text styles
 */
export const useTextStyles = () => {
  const { colors, typography } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        h1: {
          fontSize: typography.fontSize.xxxl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
        },
        h2: {
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
        },
        h3: {
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
        },
        h4: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text,
        },
        body: {
          fontSize: typography.fontSize.base,
          color: colors.text,
          lineHeight: typography.lineHeight.relaxed,
        },
        bodySecondary: {
          fontSize: typography.fontSize.base,
          color: colors.textSecondary,
          lineHeight: typography.lineHeight.relaxed,
        },
        caption: {
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
        },
        error: {
          fontSize: typography.fontSize.base,
          color: colors.error,
        },
      }),
    [colors, typography]
  );
};

/**
 * Optimized hook for header styles
 */
export const useHeaderStyles = () => {
  const { colors, typography, spacing, styles: themeStyles } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        header: {
          ...themeStyles.header,
        },
        headerTitle: {
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          marginBottom: spacing.sm,
        },
        headerSubtitle: {
          fontSize: typography.fontSize.base,
          color: colors.textSecondary,
        },
      }),
    [colors, typography, spacing, themeStyles]
  );
};

/**
 * Optimized hook for section styles
 */
export const useSectionStyles = () => {
  const { colors, typography, spacing, styles: themeStyles } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        section: themeStyles.section,
        sectionTitle: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text,
          paddingHorizontal: spacing.xl,
          marginBottom: spacing.lg,
        },
      }),
    [colors, typography, spacing, themeStyles]
  );
};

/**
 * Optimized hook for quiz/option styles
 */
export const useQuizStyles = () => {
  const { colors, spacing, borderRadius, styles: themeStyles } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        optionButton: {
          ...themeStyles.optionButton,
          padding: spacing.lg,
        },
        optionText: themeStyles.optionText,
        optionSelected: themeStyles.optionSelected,
        optionCorrect: themeStyles.optionCorrect,
        optionIncorrect: themeStyles.optionIncorrect,
        feedbackContainer: {
          padding: spacing.xl,
          borderRadius: borderRadius.lg,
          borderWidth: 2,
        },
        feedbackCorrect: {
          backgroundColor: colors.primaryLight,
          borderColor: colors.primary,
        },
        feedbackIncorrect: {
          backgroundColor: colors.errorLight,
          borderColor: colors.error,
        },
      }),
    [colors, spacing, borderRadius, themeStyles]
  );
};

/**
 * Optimized hook for loading/spinner styles
 */
export const useLoadingStyles = () => {
  const { colors, typography, spacing } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xl,
        },
        message: {
          marginTop: spacing.xl,
          fontSize: typography.fontSize.base,
          color: colors.textSecondary,
          textAlign: 'center',
        },
      }),
    [colors, typography, spacing]
  );
};

/**
 * Optimized hook for stat card styles
 */
export const useStatCardStyles = () => {
  const { colors, typography, spacing } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        statCard: {
          flex: 1,
          padding: spacing.xl,
          alignItems: 'center',
        },
        statNumber: {
          fontSize: typography.fontSize.huge,
          fontWeight: typography.fontWeight.bold,
          color: colors.primary,
        },
        statLabel: {
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
          marginTop: spacing.xs,
        },
      }),
    [colors, typography, spacing]
  );
};

/**
 * Optimized hook for progress bar styles
 */
export const useProgressBarStyles = () => {
  const { styles: themeStyles } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        progressBar: themeStyles.progressBar,
        progressFill: themeStyles.progressFill,
      }),
    [themeStyles]
  );
};

/**
 * Optimized hook for badge styles
 */
export const useBadgeStyles = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        badge: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: borderRadius.sm,
        },
        badgeSuccess: {
          backgroundColor: colors.primaryLight,
        },
        badgeError: {
          backgroundColor: colors.errorLight,
        },
        badgeInfo: {
          backgroundColor: colors.infoLight,
        },
        badgeText: {
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.semibold,
        },
      }),
    [colors, typography, spacing, borderRadius]
  );
};
