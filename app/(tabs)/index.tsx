import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from '@/components/common/Card';
import { GuideMeFlow } from '@/components/discover/GuideMeFlow';
import { SurpriseMeFlow } from '@/components/discover/SurpriseMeFlow';
import { useAppStore } from '@/store/useAppStore';

export default function DiscoverScreen() {
  const [flowMode, setFlowMode] = useState<'idle' | 'surprise' | 'guided'>('idle');
  const { profile } = useAppStore();

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
      <View style={styles.header}>
        <Text style={styles.title}>Expand Your Architecture Knowledge</Text>
        <Text style={styles.subtitle}>
          You've discovered {profile.statistics.breadthExpansion.totalDiscovered} technologies
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

      <TouchableOpacity onPress={handleSurpriseMe}>
        <Card style={styles.modeCard}>
          <Text style={styles.modeIcon}>🎲</Text>
          <View style={styles.modeContent}>
            <Text style={styles.modeTitle}>Surprise Me</Text>
            <Text style={styles.modeDescription}>
              Discover a random technology you haven't learned yet
            </Text>
          </View>
        </Card>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleGuideMe}>
        <Card style={styles.modeCard}>
          <Text style={styles.modeIcon}>🧭</Text>
          <View style={styles.modeContent}>
            <Text style={styles.modeTitle}>Guide Me</Text>
            <Text style={styles.modeDescription}>
              Answer a few questions to find relevant technologies
            </Text>
          </View>
        </Card>
      </TouchableOpacity>

      <View style={styles.tipContainer}>
        <Text style={styles.tipTitle}>💡 Pro Tip</Text>
        <Text style={styles.tipText}>
          Aim to discover 3-5 new technologies each week to steadily expand your architectural breadth
        </Text>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  modeCard: {
    flexDirection: 'row',
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 15,
  },
  modeIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
  },
  tipContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
});