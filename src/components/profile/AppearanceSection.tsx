import { useTheme } from '@/contexts/ThemeContext';
import { type ThemePreference } from '@/hooks/use-color-scheme';
import { useSectionStyles } from '@/hooks/useComponentStyles';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: 'Light', value: 'light' },
  { label: 'System', value: 'system' },
  { label: 'Dark', value: 'dark' },
];

export function AppearanceSection() {
  const { colors, typography, spacing, borderRadius, themePreference, setThemePreference } = useTheme();
  const sectionStyles = useSectionStyles();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        segmentedControl: {
          flexDirection: 'row',
          marginHorizontal: spacing.xl,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        option: {
          flex: 1,
          paddingVertical: spacing.sm,
          alignItems: 'center',
          backgroundColor: colors.cardBackground,
        },
        optionSelected: {
          backgroundColor: colors.primary,
        },
        optionText: {
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          color: colors.textSecondary,
        },
        optionTextSelected: {
          color: colors.onPrimary,
          fontWeight: typography.fontWeight.semibold,
        },
      }),
    [colors, typography, spacing, borderRadius]
  );

  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.sectionTitle}>Appearance</Text>
      <View style={styles.segmentedControl}>
        {OPTIONS.map(({ label, value }) => {
          const isSelected = themePreference === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => setThemePreference(value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${label} theme`}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
