import React from 'react';
import { Topic } from '../../types';
import { hasSectionData } from '../../utils/streamingParser';
import { SafeAreaScrollView } from '../common/SafeAreaScrollView';
import { FadeInItemWrapper, FadeInView, TypewriterText } from '../common/StreamingAnimations';
import { ComparisonSection } from './sections/ComparisonSection';
import { HeaderSection } from './sections/HeaderSection';
import { LearningResourcesSection } from './sections/LearningResourcesSection';
import { ListSection } from './sections/ListSection';
import { TextSection } from './sections/TextSection';
import { useTopicCardStyles } from './topicCardStyles';

interface Props {
  topic: Partial<Topic>;
  isComplete: boolean;  // Has all required fields loaded
}

/**
 * Unified topic card that handles both:
 * 1. Streaming state - Shows typewriter/fade-in effects for incomplete data
 * 2. Static state - Shows complete data without animations
 */
export const TopicCard: React.FC<Props> = ({ topic, isComplete }) => {
  const styles = useTopicCardStyles();

  const hasHeader = hasSectionData(topic, 'header');
  const hasWhat = hasSectionData(topic, 'what');
  const hasWhy = hasSectionData(topic, 'why');
  const hasPros = hasSectionData(topic, 'pros');
  const hasCons = hasSectionData(topic, 'cons');
  const hasCompare = hasSectionData(topic, 'compare');
  const hasLearningResources = hasSectionData(topic, 'learningResources');

  // Build learning resource links from flat streaming fields or nested content
  const flatData = topic as any;
  const learningResources: { title: string; url: string }[] =
    flatData.content?.learningResources ??
    ([0, 1, 2, 3, 4]
      .map((i) => {
        const title = flatData[`resource_${i}_title`];
        const url = flatData[`resource_${i}_url`];
        return title && url ? { title, url } : null;
      })
      .filter(Boolean) as { title: string; url: string }[]);

  const pros = flatData.content?.pros || [
    flatData.pro_0,
    flatData.pro_1,
    flatData.pro_2,
    flatData.pro_3,
    flatData.pro_4,
  ].filter(Boolean);

  const cons = flatData.content?.cons || [
    flatData.con_0,
    flatData.con_1,
    flatData.con_2,
    flatData.con_3,
    flatData.con_4,
  ].filter(Boolean);

  const comparisons = flatData.content?.compareToSimilar || [];
  if (flatData.compare_0_tech && flatData.compare_0_text) {
    comparisons.push({ topic: flatData.compare_0_tech, comparison: flatData.compare_0_text });
  }
  if (flatData.compare_1_tech && flatData.compare_1_text && comparisons.length < 2) {
    comparisons.push({ topic: flatData.compare_1_tech, comparison: flatData.compare_1_text });
  }

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
        category={topic.category}
        subcategory={topic.subcategory}
        name={topic.name}
        topicType={topic.topicType}
        isLoading={!isComplete && !hasHeader}
        LoadingWrapper={!isComplete ? FadeInView : undefined}
      />

      <TextSection
        title="What is it?"
        content={flatData.content?.what || flatData.what}
        isLoading={!isComplete && !hasWhat}
        ContentWrapper={!isComplete ? TypewriterText : undefined}
      />

      <TextSection
        title="Why use it?"
        content={flatData.content?.why || flatData.why}
        isLoading={!isComplete && !hasWhy}
        ContentWrapper={!isComplete ? TypewriterText : undefined}
      />

      <ListSection
        title="Advantages"
        items={pros}
        iconName="checkmark-circle-outline"
        iconColor="#10B981"
        isLoading={!isComplete && !hasPros}
        ItemWrapper={!isComplete ? FadeInItemWrapper : undefined}
      />

      <ListSection
        title="Trade-offs"
        items={cons}
        iconName="alert-circle-outline"
        iconColor="#F59E0B"
        isLoading={!isComplete && !hasCons}
        ItemWrapper={!isComplete ? FadeInItemWrapper : undefined}
      />

      <ComparisonSection
        comparisons={comparisons}
        isLoading={!isComplete && !hasCompare}
        ItemWrapper={!isComplete ? FadeInComparisonWrapper : undefined}
      />

      {hasLearningResources && learningResources.length > 0 && (
        <LearningResourcesSection
          resources={learningResources}
          isLoading={!isComplete && !hasLearningResources}
          ItemWrapper={!isComplete ? FadeInItemWrapper : undefined}
        />
      )}
    </SafeAreaScrollView>
  );
};