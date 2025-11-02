import { useTheme } from '@/contexts/ThemeContext';
import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';

/**
 * Optimized hook for topic list card styles
 */
export const useTopicListCardStyles = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        swipeableContainer: {
          marginHorizontal: spacing.xl,
          marginBottom: spacing.lg,
          position: 'relative',
        },
        actionContainer: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: 'row',
          justifyContent: 'space-between',
          zIndex: -1,
        },
        card: {
          backgroundColor: colors.cardBackground,
          borderRadius: borderRadius.md,
          padding: spacing.xl,
          borderLeftWidth: 3,
          ...Platform.select({
            ios: {
              shadowColor: colors.text,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
            },
            android: {
              elevation: 1,
            },
          }),
        },
        cardDiscovered: {
          borderLeftColor: colors.primary,
        },
        cardLearned: {
          borderLeftColor: colors.success || '#10B981',
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: spacing.sm,
        },
        headerLeft: {
          flex: 1,
          marginRight: spacing.md,
        },
        topicName: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text,
          lineHeight: typography.fontSize.lg * 1.3,
          marginBottom: spacing.xs,
        },
        breadcrumb: {
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
          lineHeight: typography.fontSize.sm * 1.3,
        },
        statusBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: borderRadius.sm,
          gap: 4,
        },
        statusBadgeDiscovered: {
          backgroundColor: colors.primaryLight,
        },
        statusBadgeLearned: {
          backgroundColor: (colors.success || '#10B981') + '15',
        },
        statusText: {
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.medium,
        },
        statusTextDiscovered: {
          color: colors.primary,
        },
        statusTextLearned: {
          color: colors.success || '#10B981',
        },
        preview: {
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
          lineHeight: typography.fontSize.sm * 1.5,
          marginBottom: spacing.md,
        },
        footer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
        },
        footerText: {
          fontSize: typography.fontSize.xs,
          color: colors.textLight,
        },
        typeChip: {
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          borderRadius: borderRadius.sm,
          alignSelf: 'flex-start',
          marginBottom: spacing.sm,
        },
        typeText: {
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.medium,
        },
        rightAction: {
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          right: 0,
          backgroundColor: colors.success || '#10B981',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingLeft: spacing.xl,
          borderTopLeftRadius: borderRadius.md,
          borderBottomLeftRadius: borderRadius.md,
        },
        leftAction: {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: colors.error || '#DC2626',
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingRight: spacing.xl,
          borderTopRightRadius: borderRadius.md,
          borderBottomRightRadius: borderRadius.md,
        },
        actionText: {
          color: colors.white,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          marginTop: spacing.xs,
        },
      }),
    [colors, typography, spacing, borderRadius]
  );
};

/**
 * Optimized hook for search bar styles
 */
export const useSearchBarStyles = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          backgroundColor: colors.background,
        },
        inputContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.cardBackground,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.md,
        },
        icon: {
          marginRight: spacing.sm,
        },
        input: {
          flex: 1,
          fontSize: typography.fontSize.base,
          color: colors.text,
          paddingVertical: spacing.md,
        },
        clearButton: {
          padding: spacing.xs,
        },
        resultCount: {
          fontSize: typography.fontSize.xs,
          color: colors.textSecondary,
          marginTop: spacing.xs,
          marginLeft: spacing.xs,
        },
      }),
    [colors, typography, spacing, borderRadius]
  );
};

/**
 * Optimized hook for filter bar styles
 */
export const useFilterBarStyles = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.background,
          paddingVertical: spacing.sm,
        },
        scrollContent: {
          paddingHorizontal: spacing.xl,
          gap: spacing.sm,
        },
        chip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.sm,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.cardBackground,
        },
        chipActive: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        chipText: {
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          color: colors.text,
        },
        chipTextActive: {
          color: colors.white,
        },
        divider: {
          width: 1,
          height: 24,
          backgroundColor: colors.border,
          marginHorizontal: spacing.xs,
        },
        activeFiltersContainer: {
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.sm,
          backgroundColor: colors.background,
        },
        activeFiltersRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: spacing.xs,
        },
        activeFiltersLabel: {
          fontSize: typography.fontSize.xs,
          color: colors.textSecondary,
          fontWeight: typography.fontWeight.medium,
        },
        activeFilterChip: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: spacing.sm,
          paddingRight: spacing.xs,
          paddingVertical: spacing.xs,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.primaryLight,
          gap: spacing.xs,
        },
        activeFilterText: {
          fontSize: typography.fontSize.xs,
          color: colors.primary,
          fontWeight: typography.fontWeight.medium,
        },
        clearAllButton: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        },
        clearAllText: {
          fontSize: typography.fontSize.xs,
          color: colors.primary,
          fontWeight: typography.fontWeight.semibold,
        },
      }),
    [colors, typography, spacing, borderRadius]
  );
};

/**
 * Optimized hook for filter sheet styles
 */
export const useFilterSheetStyles = () => {
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        },
        sheetContainer: {
          backgroundColor: colors.cardBackground,
          borderTopLeftRadius: borderRadius.lg,
          borderTopRightRadius: borderRadius.lg,
          paddingBottom: spacing.xxl,
          maxHeight: '70%',
          ...shadows.medium,
        },
        handle: {
          width: 40,
          height: 4,
          backgroundColor: colors.border,
          borderRadius: borderRadius.sm,
          alignSelf: 'center',
          marginTop: spacing.md,
          marginBottom: spacing.lg,
        },
        header: {
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        title: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text,
        },
        scrollContent: {
          paddingTop: spacing.md,
        },
        optionButton: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border + '40',
        },
        optionLeft: {
          flex: 1,
        },
        optionLabel: {
          fontSize: typography.fontSize.base,
          color: colors.text,
          fontWeight: typography.fontWeight.medium,
        },
        optionCount: {
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
          marginTop: 2,
        },
        buttonContainer: {
          flexDirection: 'row',
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          gap: spacing.md,
        },
        button: {
          flex: 1,
          paddingVertical: spacing.md,
          borderRadius: borderRadius.md,
          alignItems: 'center',
        },
        buttonPrimary: {
          backgroundColor: colors.primary,
        },
        buttonSecondary: {
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        },
        buttonText: {
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
        },
        buttonTextPrimary: {
          color: colors.white,
        },
        buttonTextSecondary: {
          color: colors.text,
        },
      }),
    [colors, typography, spacing, borderRadius, shadows]
  );
};

/**
 * Optimized hook for empty state styles
 */
export const useEmptyStateStyles = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xxl,
        },
        iconContainer: {
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        },
        title: {
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          marginBottom: spacing.sm,
          textAlign: 'center',
        },
        subtitle: {
          fontSize: typography.fontSize.base,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: typography.fontSize.base * 1.5,
          marginBottom: spacing.lg,
        },
        button: {
          paddingHorizontal: spacing.xxl,
          paddingVertical: spacing.md,
          borderRadius: borderRadius.md,
          backgroundColor: colors.primary,
        },
        buttonText: {
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          color: colors.white,
        },
      }),
    [colors, typography, spacing, borderRadius]
  );
};
