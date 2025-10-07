import React from 'react';
import { ScrollView } from 'react-native';
import { Technology } from '../../types';
import { HeaderSection } from './sections/HeaderSection';
import { TextSection } from './sections/TextSection';
import { ListSection } from './sections/ListSection';
import { ComparisonSection } from './sections/ComparisonSection';
import { technologyCardStyles } from './technologyCardStyles';

interface Props {
  technology: Technology;
}

export const TechnologyCard: React.FC<Props> = ({ technology }) => {
  return (
    <ScrollView style={technologyCardStyles.container}>
      <HeaderSection
        category={technology.category}
        subcategory={technology.subcategory}
        name={technology.name}
      />

      <TextSection title="What is it?" content={technology.content.what} />

      <TextSection title="Why use it?" content={technology.content.why} />

      <ListSection title="Advantages" items={technology.content.pros} bulletPoint="✓" />

      <ListSection title="Trade-offs" items={technology.content.cons} bulletPoint="•" />

      <ComparisonSection comparisons={technology.content.compareToSimilar} />
    </ScrollView>
  );
};