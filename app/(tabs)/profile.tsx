import { BreadthExpansionStats } from '@/components/profile/BreadthExpansionStats';
import { CategoryBreakdownList } from '@/components/profile/CategoryBreakdownList';
import { MilestonesList } from '@/components/profile/MilestonesList';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { QuizPerformanceCard } from '@/components/profile/QuizPerformanceCard';
import { UserProfileHeader } from '@/components/profile/UserProfileHeader';
import { LogoutButton } from '@/components/profile/LogoutButton';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import React from 'react';
import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LightColors, DarkColors, spacing, typography } from '@/styles/globalStyles';

export default function ProfileScreen() {
  const { profile } = useAppStore();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles, theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;
  const styles = useStyles(colors);
  const { user, isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <View style={[themeStyles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <View style={[themeStyles.container, styles.unauthContainer]}>
        <Text style={styles.unauthTitle}>Not Logged In</Text>
        <Text style={styles.unauthText}>
          Please login to view your profile and sync your progress.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={themeStyles.container}>
      <ProfileHeader paddingTop={Math.max(insets.top, 20)} />

      {/* User Profile Card */}
      <UserProfileHeader user={user} />

      {/* Stats - Existing Components */}
      <BreadthExpansionStats
        totalDiscovered={profile.statistics.breadthExpansion.totalDiscovered}
        totalLearned={profile.statistics.breadthExpansion.totalLearned}
        inBucketList={profile.statistics.breadthExpansion.inBucketList}
        learningRate={profile.statistics.breadthExpansion.learningRate}
      />

      <QuizPerformanceCard
        totalQuizzesTaken={profile.statistics.quizPerformance.totalQuizzesTaken}
        averageScore={profile.statistics.quizPerformance.averageScore}
        passRate={profile.statistics.quizPerformance.passRate}
      />

      <CategoryBreakdownList
        categoryBreakdown={profile.statistics.categoryBreakdown}
      />

      <MilestonesList milestones={profile.milestones} />

      {/* Logout Button */}
      <LogoutButton />

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const useStyles = (colors: typeof LightColors) => {
  return React.useMemo(
    () =>
      StyleSheet.create({
        loadingContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        unauthContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
        },
        unauthTitle: {
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          marginBottom: spacing.md,
        },
        unauthText: {
          fontSize: typography.fontSize.base,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: typography.lineHeight.relaxed,
        },
        spacer: {
          height: spacing.xxl,
        },
      }),
    [colors]
  );
};