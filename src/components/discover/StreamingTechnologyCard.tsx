import React, { useEffect, useState } from 'react';
import {
  Animated,
  Text,
} from 'react-native';
import { Technology } from '../../types';
import { hasSectionData } from '../../utils/streamingJsonParser';
import { SafeAreaScrollView } from '../common/SafeAreaScrollView';
import { ComparisonSection } from './sections/ComparisonSection';
import { HeaderSection } from './sections/HeaderSection';
import { ListSection } from './sections/ListSection';
import { TextSection } from './sections/TextSection';
import { useTechnologyCardStyles } from './technologyCardStyles';

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
  const styles = useTechnologyCardStyles();

  const hasHeader = hasSectionData(partialData, 'header');
  const hasWhat = hasSectionData(partialData, 'what');
  const hasWhy = hasSectionData(partialData, 'why');
  const hasPros = hasSectionData(partialData, 'pros');
  const hasCons = hasSectionData(partialData, 'cons');
  const hasCompare = hasSectionData(partialData, 'compare');

  const FadeInItemWrapper: React.FC<{ children: React.ReactNode; index: number }> = ({
    children,
    index
  }) => (
    <FadeInView delay={index * 100}>
      {children}
    </FadeInView>
  );

  const FadeInComparisonWrapper: React.FC<{ children: React.ReactNode; index: number }> = ({
    children,
    index
  }) => (
    <FadeInView delay={index * 150}>
      {children}
    </FadeInView>
  );

  return (
    <SafeAreaScrollView style={styles.container}>
      <HeaderSection
        category={partialData.category}
        subcategory={partialData.subcategory}
        name={partialData.name}
        isLoading={!hasHeader}
        LoadingWrapper={FadeInView}
      />

      <TextSection
        title="What is it?"
        content={partialData.content?.what}
        isLoading={!hasWhat}
        ContentWrapper={TypewriterText}
      />

      <TextSection
        title="Why use it?"
        content={partialData.content?.why}
        isLoading={!hasWhy}
        ContentWrapper={TypewriterText}
      />

      <ListSection
        title="Advantages"
        items={partialData.content?.pros}
        bulletPoint="✓"
        isLoading={!hasPros}
        ItemWrapper={FadeInItemWrapper}
      />

      <ListSection
        title="Trade-offs"
        items={partialData.content?.cons}
        bulletPoint="•"
        isLoading={!hasCons}
        ItemWrapper={FadeInItemWrapper}
      />

      <ComparisonSection
        comparisons={partialData.content?.compareToSimilar}
        isLoading={!hasCompare}
        ItemWrapper={FadeInComparisonWrapper}
      />
    </SafeAreaScrollView>
  );
};

