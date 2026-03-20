import { useTheme } from '@/contexts/ThemeContext';
import { StyleSheet } from 'react-native';

export const useTopicCardStyles = () => {
  const { colors, typography, spacing, styles: themeStyles, isDark } = useTheme();

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    headerCard: {
      margin: spacing.lg,
      padding: spacing.xl,
      backgroundColor: isDark ? colors.cardBackground : colors.primary,
      ...(isDark && {
        borderLeftWidth: 5,
        borderLeftColor: colors.primary,
      }),
    },
    categoryLabel: {
      fontSize: typography.fontSize.sm,
      color: isDark ? colors.primaryDark : colors.primaryLight,
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: typography.fontSize.xxxl,
      fontWeight: typography.fontWeight.bold,
      color: isDark ? colors.text : colors.white,
    },
    contentCard: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      padding: spacing.xl,
    },
    sectionTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    contentText: {
      ...themeStyles.bodyText,
      lineHeight: typography.lineHeight.relaxed,
    },
    listItem: {
      flexDirection: 'row',
      marginBottom: spacing.md,
    },
    bulletPoint: {
      marginRight: 10,
      width: 20,
      alignItems: 'center',
      justifyContent: 'center',
    } as any,
    listText: {
      flex: 1,
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
      lineHeight: typography.lineHeight.normal,
    },
    comparisonItem: {
      marginBottom: spacing.lg,
    },
    comparisonTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      marginBottom: 6,
    },
    comparisonText: {
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
      lineHeight: typography.lineHeight.normal,
    },
    resourceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: 10,
      backgroundColor: isDark ? colors.cardBackground : colors.primaryLight + '18',
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: isDark ? colors.border : colors.primaryLight,
    } as any,
    resourceItemPressed: {
      opacity: 0.7,
    },
    resourceIconLeft: {
      marginRight: spacing.md,
    },
    resourceTextContainer: {
      flex: 1,
    },
    resourceTitle: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.medium,
      color: isDark ? colors.primaryDark : colors.primary,
      lineHeight: typography.lineHeight.normal,
    },
    resourceDomain: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    resourceIconRight: {
      marginLeft: spacing.sm,
    },
  });
};
