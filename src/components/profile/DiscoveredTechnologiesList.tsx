import React from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { Technology } from '@/types';
import { Colors, Typography, Spacing, BorderRadius, CommonStyles } from '@/styles/globalStyles';

interface DiscoveredTechnologiesListProps {
  technologies: Technology[];
  onTestKnowledge: (technologyId: string) => void;
}

export const DiscoveredTechnologiesList: React.FC<DiscoveredTechnologiesListProps> = ({
  technologies,
  onTestKnowledge,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Discovered Technologies ({technologies.length})</Text>
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
            {tech.status === 'discovered' && (
              <Pressable
                style={({ pressed }) => [
                  styles.testButton,
                  styles.touchable,
                  pressed && styles.pressed
                ]}
                onPress={() => onTestKnowledge(tech.id)}
              >
                <Text style={styles.testButtonText}>🎯 Test Knowledge</Text>
              </Pressable>
            )}
          </Card>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: CommonStyles.section,
  sectionTitle: CommonStyles.sectionTitle,
  emptyCard: {
    marginHorizontal: Spacing.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  techCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: 10,
    padding: Spacing.lg,
  },
  techHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  techName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    flex: 1,
  },
  techStatus: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.sm,
  },
  techStatusLearned: {
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  techCategory: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  testButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: 10,
    alignItems: 'center',
  },
  testButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  touchable: {
    cursor: 'pointer' as any,
  },
  pressed: CommonStyles.pressed,
});
