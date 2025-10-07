import { StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, CommonStyles } from '@/styles/globalStyles';

export const technologyCardStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    margin: Spacing.lg,
    padding: Spacing.xl,
    backgroundColor: Colors.primary,
  },
  categoryLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primaryLight,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  contentCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  contentText: {
    ...CommonStyles.bodyText,
    lineHeight: Typography.lineHeight.relaxed,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  bulletPoint: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    marginRight: 10,
    width: 20,
  },
  listText: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.normal,
  },
  comparisonItem: {
    marginBottom: Spacing.lg,
  },
  comparisonTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: 6,
  },
  comparisonText: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.normal,
  },
});
