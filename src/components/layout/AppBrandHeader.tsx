import { useTheme } from '@/contexts/ThemeContext';
import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface AppBrandHeaderProps {
  paddingTop: number;
}

export const AppBrandHeader: React.FC<AppBrandHeaderProps> = ({ paddingTop }) => {
  const { colors, spacing, typography, borderRadius, styles: themeStyles } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          ...themeStyles.header,
          paddingTop,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.lg,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        icon: {
          width: typography.fontSize.lg,
          height: typography.fontSize.lg,
          borderRadius: borderRadius.sm,
          marginRight: spacing.xs,
        },
        title: {
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
        },
      }),
    [borderRadius, colors, paddingTop, spacing, themeStyles, typography]
  );

  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <Image
          source={require('../../../assets/images/icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.title}>Breadthwise</Text>
      </View>
    </View>
  );
};
