import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/store/useAppStore';

export default function ProfileScreen() {
  const { profile, technologies } = useAppStore();
  const router = useRouter();

  const handleTestKnowledge = (technologyId: string) => {
    router.push({
      pathname: '/quiz',
      params: { technologyId }
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress</Text>
        <Text style={styles.subtitle}>Track your architecture learning journey</Text>
      </View>

      {/* Breadth Expansion Dashboard */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Breadth Expansion</Text>
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{profile.statistics.breadthExpansion.totalDiscovered}</Text>
            <Text style={styles.statLabel}>Discovered</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{profile.statistics.breadthExpansion.totalLearned}</Text>
            <Text style={styles.statLabel}>Learned</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{profile.statistics.breadthExpansion.inBucketList}</Text>
            <Text style={styles.statLabel}>In Bucket</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{profile.statistics.breadthExpansion.learningRate}%</Text>
            <Text style={styles.statLabel}>Learning Rate</Text>
          </Card>
        </View>
      </View>

      {/* Quiz Performance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiz Performance</Text>
        <Card style={styles.perfCard}>
          <View style={styles.perfRow}>
            <Text style={styles.perfLabel}>Quizzes Taken:</Text>
            <Text style={styles.perfValue}>{profile.statistics.quizPerformance.totalQuizzesTaken}</Text>
          </View>
          <View style={styles.perfRow}>
            <Text style={styles.perfLabel}>Average Score:</Text>
            <Text style={styles.perfValue}>{profile.statistics.quizPerformance.averageScore}%</Text>
          </View>
          <View style={styles.perfRow}>
            <Text style={styles.perfLabel}>Pass Rate:</Text>
            <Text style={styles.perfValue}>{profile.statistics.quizPerformance.passRate}%</Text>
          </View>
        </Card>
      </View>

      {/* Category Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        {Object.entries(profile.statistics.categoryBreakdown).map(([category, stats]) => (
          <Card key={category} style={styles.categoryCard}>
            <Text style={styles.categoryName}>{category}</Text>
            <View style={styles.categoryStats}>
              <Text style={styles.categoryText}>
                {stats.learned} learned / {stats.discovered} discovered ({stats.learningRate}%)
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${stats.learningRate}%` }]} />
            </View>
          </Card>
        ))}
      </View>

      {/* Milestones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Milestones</Text>
        {profile.milestones.map((milestone, index) => {
          const cardStyle: any = milestone.achievedAt
            ? [styles.milestoneCard, styles.milestoneAchieved]
            : styles.milestoneCard;
          return (
            <Card key={index} style={cardStyle}>
              <Text style={styles.milestoneIcon}>{milestone.icon}</Text>
              <View style={styles.milestoneContent}>
                <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                <Text style={styles.milestoneStatus}>
                  {milestone.achievedAt ? '✓ Achieved!' : `Reach ${milestone.threshold}`}
                </Text>
              </View>
            </Card>
          );
        })}
      </View>

      {/* Discovered Technologies List */}
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
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={() => handleTestKnowledge(tech.id)}
                >
                  <Text style={styles.testButtonText}>🎯 Test Knowledge</Text>
                </TouchableOpacity>
              )}
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  perfCard: {
    marginHorizontal: 20,
    padding: 20,
  },
  perfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  perfLabel: {
    fontSize: 16,
    color: '#666',
  },
  perfValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  categoryStats: {
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  milestoneCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    alignItems: 'center',
    opacity: 0.6,
  },
  milestoneAchieved: {
    opacity: 1,
    backgroundColor: '#E8F5E9',
  },
  milestoneIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  milestoneStatus: {
    fontSize: 14,
    color: '#666',
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
});