import React from 'react';
import { Text, View } from 'react-native';
import { useHeaderStyles } from '@/hooks/useComponentStyles';
import { useTheme } from '@/contexts/ThemeContext';

interface ProfileHeaderProps {
  paddingTop: number;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ paddingTop }) => {
  const { spacing } = useTheme();
  const styles = useHeaderStyles();

  return (
    <View style={[styles.header, { paddingTop, padding: spacing.xl }]}>
      <Text style={styles.headerTitle}>Your Progress</Text>
      <Text style={styles.headerSubtitle}>Track your architecture learning journey</Text>
    </View>
  );
};
