import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ProfileHeaderProps {
  paddingTop: number;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ paddingTop }) => {
  const { spacing, styles: themeStyles } = useTheme();

  const styles = StyleSheet.create({
    header: {
      ...themeStyles.header,
      padding: spacing.xl,
    },
    title: themeStyles.headerTitle,
    subtitle: themeStyles.headerSubtitle,
  });

  return (
    <View style={[styles.header, { paddingTop }]}>
      <Text style={styles.title}>Your Progress</Text>
      <Text style={styles.subtitle}>Track your architecture learning journey</Text>
    </View>
  );
};
