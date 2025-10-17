import React from 'react';
import { Technology } from '../../types';
import { hasSectionData } from '../../utils/streamingParser';
import { SafeAreaScrollView } from '../common/SafeAreaScrollView';
import { FadeInView, FadeInItemWrapper, TypewriterText } from '../common/StreamingAnimations';
import { ComparisonSection } from './sections/ComparisonSection';
import { HeaderSection } from './sections/HeaderSection';
import { ListSection } from './sections/ListSection';
import { TextSection } from './sections/TextSection';
import { useTechnologyCardStyles } from './technologyCardStyles';

interface Props {
  partialData: Partial<Technology>;
}

export const StreamingTechnologyCard: React.FC<Props> = ({ partialData }) => {
  const styles = useTechnologyCardStyles();

  const hasHeader = hasSectionData(partialData, 'header');
  const hasWhat = hasSectionData(partialData, 'what');
  const hasWhy = hasSectionData(partialData, 'why');
  const hasPros = hasSectionData(partialData, 'pros');
  const hasCons = hasSectionData(partialData, 'cons');
  const hasCompare = hasSectionData(partialData, 'compare');

  // Transform flat format to nested for display
  // During streaming, partialData will have flat fields (pro_0, pro_1, etc.)
  // We need to collect them into arrays for the UI components
  const flatData = partialData as any;
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
        category={partialData.category}
        subcategory={partialData.subcategory}
        name={partialData.name}
        isLoading={!hasHeader}
        LoadingWrapper={FadeInView}
      />

      <TextSection
        title="What is it?"
        content={flatData.content?.what || flatData.what}
        isLoading={!hasWhat}
        ContentWrapper={TypewriterText}
      />

      <TextSection
        title="Why use it?"
        content={flatData.content?.why || flatData.why}
        isLoading={!hasWhy}
        ContentWrapper={TypewriterText}
      />

      <ListSection
        title="Advantages"
        items={pros}
        bulletPoint="✓"
        isLoading={!hasPros}
        ItemWrapper={FadeInItemWrapper}
      />

      <ListSection
        title="Trade-offs"
        items={cons}
        bulletPoint="•"
        isLoading={!hasCons}
        ItemWrapper={FadeInItemWrapper}
      />

      <ComparisonSection
        comparisons={comparisons}
        isLoading={!hasCompare}
        ItemWrapper={FadeInComparisonWrapper}
      />
    </SafeAreaScrollView>
  );
};

