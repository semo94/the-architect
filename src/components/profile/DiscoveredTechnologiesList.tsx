import React, { useMemo } from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { Technology } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useSectionStyles } from '@/hooks/useComponentStyles';

interface DiscoveredTechnologiesListProps {
  technologies: Technology[];
  onTestKnowledge: (technologyId: string) => void;
  onDelete: (technologyId: string) => void;
}

export const DiscoveredTechnologiesList: React.FC<DiscoveredTechnologiesListProps> = ({
  technologies,
  onTestKnowledge,
  onDelete,
}) => {
  const { colors, typography, spacing, borderRadius, styles: themeStyles } = useTheme();
  const sectionStyles = useSectionStyles();

  const styles = useMemo(() => StyleSheet.create({
    emptyCard: {
      marginHorizontal: spacing.xl,
      padding: spacing.xxl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    emptySubtext: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
    techCard: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      padding: spacing.lg,
    },
    techHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    techName: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      flex: 1,
    },
    techStatus: {
      fontSize: typography.fontSize.xs,
      color: colors.secondary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: colors.secondaryLight,
      borderRadius: borderRadius.sm,
    },
    techStatusLearned: {
      color: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    techCategory: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    testButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      marginTop: spacing.md,
      alignItems: 'center',
    },
    testButtonText: {
      color: colors.white,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
    },
    deleteButton: {
      backgroundColor: colors.error || '#DC2626',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      marginTop: spacing.md,
      alignItems: 'center',
    },
    deleteButtonText: {
      color: colors.white,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    buttonFlex: {
      flex: 1,
    },
    touchable: themeStyles.touchable,
    pressed: themeStyles.pressed,
  }), [colors, typography, spacing, borderRadius, themeStyles]);

  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.sectionTitle}>Discovered Technologies ({technologies.length})</Text>
      {technologies.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No technologies discovered yet!</Text>
          <Text style={styles.emptySubtext}>Go to Discover tab to start your journey</Text>
        </Card>
      ) : (
        technologies.map((tech) => (
          <Card key={tech.id} style={styles.techCard}>
            <View style={styles.techHeader}>
              <Text style={styles.techName}>{tech.name}</Text>
              <Text style={[
                styles.techStatus,
                tech.status === 'learned' && styles.techStatusLearned
              ]}>
                {tech.status === 'learned' ? '✓ Learned' : '📋 Discovered'}
              </Text>
            </View>
            <Text style={styles.techCategory}>{tech.category} › {tech.subcategory}</Text>
            <View style={styles.buttonRow}>
              {tech.status === 'discovered' && (
                <Pressable
                  style={({ pressed }) => [
                    styles.testButton,
                    styles.buttonFlex,
                    styles.touchable,
                    pressed && styles.pressed
                  ]}
                  onPress={() => onTestKnowledge(tech.id)}
                >
                  <Text style={styles.testButtonText}>🎯 Test Knowledge</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.deleteButton,
                  tech.status === 'discovered' ? styles.buttonFlex : { flex: 1 },
                  styles.touchable,
                  pressed && styles.pressed
                ]}
                onPress={() => onDelete(tech.id)}
              >
                <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}
    </View>
  );
};
