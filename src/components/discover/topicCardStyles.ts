import { StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export const useTopicCardStyles = () => {
  const { colors, typography, spacing, styles: themeStyles } = useTheme();

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    headerCard: {
      margin: spacing.lg,
      padding: spacing.xl,
      backgroundColor: colors.primary,
    },
    categoryLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.primaryLight,
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: typography.fontSize.xxxl,
      fontWeight: typography.fontWeight.bold,
      color: colors.white,
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
      fontSize: typography.fontSize.base,
      color: colors.primary,
      marginRight: 10,
      width: 20,
    },
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
  });
};
