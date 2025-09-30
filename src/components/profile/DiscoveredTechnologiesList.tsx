import React from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { Card } from '@/components/common/Card';
import { Technology } from '@/types';

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
  section: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  emptyCard: {
    marginHorizontal: 20,
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  techCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
  },
  techHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  techName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  techStatus: {
    fontSize: 12,
    color: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
  },
  techStatusLearned: {
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  techCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  testButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  touchable: {
    cursor: 'pointer' as any,
  },
  pressed: {
    opacity: 0.7,
  },
});
