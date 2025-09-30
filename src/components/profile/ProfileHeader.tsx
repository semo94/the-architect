import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
