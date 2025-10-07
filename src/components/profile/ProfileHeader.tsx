import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Typography, Spacing, CommonStyles } from '@/styles/globalStyles';

interface ProfileHeaderProps {
  paddingTop: number;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ paddingTop }) => {
  return (
    <View style={[styles.header, { paddingTop }]}>
      <Text style={styles.title}>Your Progress</Text>
      <Text style={styles.subtitle}>Track your architecture learning journey</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    ...CommonStyles.header,
    padding: Spacing.xl,
  },
  title: CommonStyles.headerTitle,
  subtitle: CommonStyles.headerSubtitle,
});
