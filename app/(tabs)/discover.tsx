import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/common/Card';
import { GuideMeFlow } from '@/components/discover/GuideMeFlow';
import { SurpriseMeFlow } from '@/components/discover/SurpriseMeFlow';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/contexts/ThemeContext';

export default function DiscoverScreen() {
  const [flowMode, setFlowMode] = useState<'idle' | 'surprise' | 'guided'>('idle');
  const { profile } = useAppStore();
  const insets = useSafeAreaInsets();
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
    statsContainer: {
      flexDirection: 'row',
      padding: spacing.xl,
      gap: spacing.lg,
    },
    statCard: themeStyles.statCard,
    statNumber: themeStyles.statNumber,
    statLabel: themeStyles.statLabel,
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
      fontSize: typography.fontSize.massive,
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
    setFlowMode('surprise');
  };

  const handleGuideMe = () => {
    setFlowMode('guided');
  };

  const handleFlowComplete = () => {
    setFlowMode('idle');
  };

  if (flowMode === 'surprise') {
    return <SurpriseMeFlow onComplete={handleFlowComplete} />;
  }

  if (flowMode === 'guided') {
    return <GuideMeFlow onComplete={handleFlowComplete} />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.xl) }]}>
        <Text style={styles.title}>Expand Your Architecture Knowledge</Text>
        <Text style={styles.subtitle}>
          You&apos;ve discovered {profile.statistics.breadthExpansion.totalDiscovered} technologies
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>
            {profile.statistics.breadthExpansion.totalLearned}
          </Text>
          <Text style={styles.statLabel}>Learned</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>
            {profile.statistics.breadthExpansion.inBucketList}
          </Text>
          <Text style={styles.statLabel}>In Bucket</Text>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>Discovery Mode</Text>

      <Pressable onPress={handleSurpriseMe} style={({ pressed }) => [styles.touchable, pressed && styles.pressed]}>
        <Card style={styles.modeCard}>
          <Text style={styles.modeIcon}>🎲</Text>
          <View style={styles.modeContent}>
            <Text style={styles.modeTitle}>Surprise Me</Text>
            <Text style={styles.modeDescription}>
              Discover a random technology you haven&apos;t learned yet
            </Text>
          </View>
        </Card>
      </Pressable>

      <Pressable onPress={handleGuideMe} style={({ pressed }) => [styles.touchable, pressed && styles.pressed]}>
        <Card style={styles.modeCard}>
          <Text style={styles.modeIcon}>🧭</Text>
          <View style={styles.modeContent}>
            <Text style={styles.modeTitle}>Guide Me</Text>
            <Text style={styles.modeDescription}>
              Answer a few questions to find relevant technologies
            </Text>
          </View>
        </Card>
      </Pressable>

      <View style={styles.tipContainer}>
        <Text style={styles.tipTitle}>💡 Pro Tip</Text>
        <Text style={styles.tipText}>
          Aim to discover 3-5 new technologies each week to steadily expand your architectural breadth
        </Text>
      </View>
    </ScrollView>
  );
}
