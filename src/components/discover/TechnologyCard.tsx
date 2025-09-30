import React from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
} from 'react-native';
import { Technology } from '../../types';
import { Card } from '../common/Card';

interface Props {
  technology: Technology;
}

export const TechnologyCard: React.FC<Props> = ({ technology }) => {
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Text style={styles.categoryLabel}>
          {technology.category} › {technology.subcategory}
        </Text>
        <Text style={styles.title}>{technology.name}</Text>
      </Card>

      <Card style={styles.contentCard}>
        <Text style={styles.sectionTitle}>What is it?</Text>
        <Text style={styles.contentText}>{technology.content.what}</Text>
      </Card>

      <Card style={styles.contentCard}>
        <Text style={styles.sectionTitle}>Why use it?</Text>
        <Text style={styles.contentText}>{technology.content.why}</Text>
      </Card>

      <Card style={styles.contentCard}>
        <Text style={styles.sectionTitle}>Advantages</Text>
        {technology.content.pros.map((pro, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.bulletPoint}>✓</Text>
            <Text style={styles.listText}>{pro}</Text>
          </View>
        ))}
      </Card>

      <Card style={styles.contentCard}>
        <Text style={styles.sectionTitle}>Trade-offs</Text>
        {technology.content.cons.map((con, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.listText}>{con}</Text>
          </View>
        ))}
      </Card>

      <Card style={styles.contentCard}>
        <Text style={styles.sectionTitle}>Compare To Similar</Text>
        {technology.content.compareToSimilar.map((comparison, index) => (
          <View key={index} style={styles.comparisonItem}>
            <Text style={styles.comparisonTitle}>vs {comparison.technology}</Text>
            <Text style={styles.comparisonText}>{comparison.comparison}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#4CAF50',
  },
  categoryLabel: {
    fontSize: 14,
    color: '#E8F5E9',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  contentCard: {
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  contentText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 10,
    width: 20,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  comparisonItem: {
    marginBottom: 15,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  comparisonText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
});