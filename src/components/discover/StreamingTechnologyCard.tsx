import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Card } from '../common/Card';
import { SkeletonLoader, SkeletonText, SkeletonBullet } from '../common/SkeletonLoader';
import { hasSectionData } from '../../utils/streamingJsonParser';
import { Technology } from '../../types';

interface Props {
  partialData: Partial<Technology>;
}

const FadeInView: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => {
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, delay]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      {children}
    </Animated.View>
  );
};

const TypewriterText: React.FC<{ text: string; speed?: number; style?: any }> = ({
  text,
  speed = 20,
  style,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return <Text style={style}>{displayedText}</Text>;
};

export const StreamingTechnologyCard: React.FC<Props> = ({ partialData }) => {
  const hasHeader = hasSectionData(partialData, 'header');
  const hasWhat = hasSectionData(partialData, 'what');
  const hasWhy = hasSectionData(partialData, 'why');
  const hasPros = hasSectionData(partialData, 'pros');
  const hasCons = hasSectionData(partialData, 'cons');
  const hasCompare = hasSectionData(partialData, 'compare');

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Card style={styles.headerCard}>
        {hasHeader ? (
          <FadeInView>
            <Text style={styles.categoryLabel}>
              {partialData.category} › {partialData.subcategory}
            </Text>
            <Text style={styles.title}>{partialData.name}</Text>
          </FadeInView>
        ) : (
          <>
            <SkeletonLoader width="60%" height={14} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="80%" height={28} />
          </>
        )}
      </Card>

      {/* What is it? */}
      <Card style={styles.contentCard}>
        <Text style={styles.sectionTitle}>What is it?</Text>
        {hasWhat ? (
          <TypewriterText text={partialData.content!.what!} style={styles.contentText} />
        ) : (
          <SkeletonText lines={3} lineHeight={24} />
        )}
      </Card>

      {/* Why use it? */}
      <Card style={styles.contentCard}>
        <Text style={styles.sectionTitle}>Why use it?</Text>
        {hasWhy ? (
          <TypewriterText text={partialData.content!.why!} style={styles.contentText} />
        ) : (
          <SkeletonText lines={3} lineHeight={24} />
        )}
      </Card>

      {/* Advantages */}
      <Card style={styles.contentCard}>
        <Text style={styles.sectionTitle}>Advantages</Text>
        {hasPros ? (
          <>
            {partialData.content!.pros!.map((pro: string, index: number) => (
              <FadeInView key={index} delay={index * 100}>
                <View style={styles.listItem}>
                  <Text style={styles.bulletPoint}>✓</Text>
                  <Text style={styles.listText}>{pro}</Text>
                </View>
              </FadeInView>
            ))}
          </>
        ) : (
          <SkeletonBullet count={4} />
        )}
      </Card>

      {/* Trade-offs */}
      <Card style={styles.contentCard}>
        <Text style={styles.sectionTitle}>Trade-offs</Text>
        {hasCons ? (
          <>
            {partialData.content!.cons!.map((con: string, index: number) => (
              <FadeInView key={index} delay={index * 100}>
                <View style={styles.listItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.listText}>{con}</Text>
                </View>
              </FadeInView>
            ))}
          </>
        ) : (
          <SkeletonBullet count={4} />
        )}
      </Card>

      {/* Compare To Similar */}
      <Card style={styles.contentCard}>
        <Text style={styles.sectionTitle}>Compare To Similar</Text>
        {hasCompare ? (
          <>
            {partialData.content!.compareToSimilar!.map((comparison: { technology: string; comparison: string }, index: number) => (
              <FadeInView key={index} delay={index * 150}>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonTitle}>vs {comparison.technology}</Text>
                  <Text style={styles.comparisonText}>{comparison.comparison}</Text>
                </View>
              </FadeInView>
            ))}
          </>
        ) : (
          <>
            <View style={styles.comparisonItem}>
              <SkeletonLoader width="40%" height={16} style={{ marginBottom: 6 }} />
              <SkeletonText lines={2} lineHeight={22} lastLineWidth="85%" />
            </View>
            <View style={styles.comparisonItem}>
              <SkeletonLoader width="45%" height={16} style={{ marginBottom: 6 }} />
              <SkeletonText lines={2} lineHeight={22} lastLineWidth="75%" />
            </View>
          </>
        )}
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
