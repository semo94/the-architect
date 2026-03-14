import { Card } from '@/components/common/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, typography, spacing, borderRadius, styles: themeStyles } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: themeStyles.container,
    touchable: themeStyles.touchable,
    pressed: themeStyles.pressed,
    header: {
      ...themeStyles.header,
      padding: spacing.xl,
    },
    title: themeStyles.headerTitle,
    subtitle: themeStyles.headerSubtitle,
    sectionTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.lg,
    },
    modeCard: {
      flexDirection: 'row',
      padding: spacing.xl,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
    },
    modeIcon: {
      marginRight: spacing.lg,
    },
    modeContent: {
      flex: 1,
    },
    modeTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    modeDescription: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
    tipContainer: {
      margin: spacing.xl,
      padding: spacing.lg,
      backgroundColor: colors.infoLight,
      borderRadius: borderRadius.md,
    },
    tipTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.secondaryDark,
      marginBottom: spacing.sm,
    },
    tipText: {
      fontSize: typography.fontSize.sm,
      color: colors.secondaryDark,
      lineHeight: typography.lineHeight.tight,
    },
  }), [colors, typography, spacing, borderRadius, themeStyles]);

  const handleSurpriseMe = () => {
    router.push('/discover-surprise');
  };

  const handleGuideMe = () => {
    router.push('/discover-guided');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.xl) }]}>
        <Text style={styles.title}>Expand Your Architecture Knowledge</Text>
        <Text style={styles.subtitle}>Choose how you want to discover today</Text>
      </View>

      <Text style={styles.sectionTitle}>Discovery Mode</Text>

      <Pressable onPress={handleSurpriseMe} style={({ pressed }) => [styles.touchable, pressed && styles.pressed]}>
        <Card style={styles.modeCard}>
          <Ionicons name="dice-outline" size={48} color={colors.primary} style={styles.modeIcon} />
          <View style={styles.modeContent}>
            <Text style={styles.modeTitle}>Surprise Me</Text>
            <Text style={styles.modeDescription}>
              Discover a random topic you haven&apos;t learned yet
            </Text>
          </View>
        </Card>
      </Pressable>

      <Pressable onPress={handleGuideMe} style={({ pressed }) => [styles.touchable, pressed && styles.pressed]}>
        <Card style={styles.modeCard}>
          <Ionicons name="compass-outline" size={48} color={colors.primary} style={styles.modeIcon} />
          <View style={styles.modeContent}>
            <Text style={styles.modeTitle}>Guide Me</Text>
            <Text style={styles.modeDescription}>
              Answer a few questions to find relevant topics
            </Text>
          </View>
        </Card>
      </Pressable>

      <View style={styles.tipContainer}>
        <Text style={styles.tipTitle}><Ionicons name="bulb-outline" size={16} color={colors.secondaryDark} />{' '}Pro Tip</Text>
        <Text style={styles.tipText}>
          Aim to discover 3-5 new topics each week to steadily expand your architectural breadth
        </Text>
      </View>
    </ScrollView>
  );
}
