import React from 'react';
import { Technology } from '../../types';
import { hasSectionData } from '../../utils/streamingParser';
import { SafeAreaScrollView } from '../common/SafeAreaScrollView';
import { FadeInItemWrapper, FadeInView, TypewriterText } from '../common/StreamingAnimations';
import { ComparisonSection } from './sections/ComparisonSection';
import { HeaderSection } from './sections/HeaderSection';
import { ListSection } from './sections/ListSection';
import { TextSection } from './sections/TextSection';
import { useTechnologyCardStyles } from './technologyCardStyles';

interface Props {
  technology: Partial<Technology>;
  isComplete: boolean;  // Has all required fields loaded
}

/**
 * Unified technology card that handles both:
 * 1. Streaming state - Shows typewriter/fade-in effects for incomplete data
 * 2. Static state - Shows complete data without animations
 */
export const TechnologyCard: React.FC<Props> = ({ technology, isComplete }) => {
  const styles = useTechnologyCardStyles();

  const hasHeader = hasSectionData(technology, 'header');
  const hasWhat = hasSectionData(technology, 'what');
  const hasWhy = hasSectionData(technology, 'why');
  const hasPros = hasSectionData(technology, 'pros');
  const hasCons = hasSectionData(technology, 'cons');
  const hasCompare = hasSectionData(technology, 'compare');

  // Transform flat format to nested for display
  // During streaming, technology will have flat fields (pro_0, pro_1, etc.)
  // We need to collect them into arrays for the UI components
  const flatData = technology as any;
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
    comparisons.push({ technology: flatData.compare_0_tech, comparison: flatData.compare_0_text });
  }
  if (flatData.compare_1_tech && flatData.compare_1_text && comparisons.length < 2) {
    comparisons.push({ technology: flatData.compare_1_tech, comparison: flatData.compare_1_text });
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
        category={technology.category}
        subcategory={technology.subcategory}
        name={technology.name}
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
        bulletPoint="✓"
        isLoading={!isComplete && !hasPros}
        ItemWrapper={!isComplete ? FadeInItemWrapper : undefined}
      />

      <ListSection
        title="Trade-offs"
        items={cons}
        bulletPoint="x"
        isLoading={!isComplete && !hasCons}
        ItemWrapper={!isComplete ? FadeInItemWrapper : undefined}
      />

      <ComparisonSection
        comparisons={comparisons}
        isLoading={!isComplete && !hasCompare}
        ItemWrapper={!isComplete ? FadeInComparisonWrapper : undefined}
      />
    </SafeAreaScrollView>
  );
};