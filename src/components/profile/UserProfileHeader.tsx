import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import type { User } from '@/services/authService';

interface UserProfileHeaderProps {
  user: User;
}

export function UserProfileHeader({ user }: UserProfileHeaderProps) {
  const styles = useStyles();

  const displayName = user.displayName || user.username;
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
      </View>
      <Text style={styles.displayName}>{displayName}</Text>
      <Text style={styles.username}>@{user.username}</Text>
      {user.email && <Text style={styles.email}>{user.email}</Text>}
    </View>
  );
}

function useStyles() {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  return React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.cardBackground,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
          marginHorizontal: spacing.lg,
          marginTop: spacing.lg,
          marginBottom: spacing.lg,
          alignItems: 'center',
          ...shadows.small,
        },
        avatarContainer: {
          marginBottom: spacing.md,
        },
        avatar: {
          width: 80,
          height: 80,
          borderRadius: borderRadius.round,
        },
        avatarPlaceholder: {
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
        },
        avatarText: {
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.bold,
          color: '#FFFFFF',
        },
        displayName: {
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          marginTop: spacing.sm,
        },
        username: {
          fontSize: typography.fontSize.base,
          color: colors.textSecondary,
          marginTop: spacing.xs,
        },
        email: {
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
          marginTop: spacing.xs,
        },
      }),
    [colors, spacing, typography, borderRadius, shadows],
  );
}
