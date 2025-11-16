import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LightColors, DarkColors, typography, borderRadius } from '@/styles/globalStyles';

interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName: string;
  size?: number;
}

export function UserAvatar({ avatarUrl, displayName, size = 80 }: UserAvatarProps) {
  const { theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const fontSize = size / 2.5;

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        styles.avatarPlaceholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary,
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: typography.fontWeight.bold as any,
    color: '#FFFFFF',
  },
});
