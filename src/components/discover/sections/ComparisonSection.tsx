import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../../common/Card';
import { SkeletonLoader, SkeletonText } from '../../common/SkeletonLoader';
import { useTechnologyCardStyles } from '../technologyCardStyles';

interface Comparison {
  technology: string;
  comparison: string;
}

interface Props {
  comparisons?: Comparison[];
  isLoading?: boolean;
  ItemWrapper?: React.FC<{ children: React.ReactNode; index: number }>;
}

export const ComparisonSection: React.FC<Props> = ({
  comparisons = [],
  isLoading = false,
  ItemWrapper,
}) => {
  const styles = useTechnologyCardStyles();

  return (
    <Card style={styles.contentCard}>
      <Text style={styles.sectionTitle}>Compare To Similar</Text>
      {isLoading ? (
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
      ) : (
        <>
          {comparisons.map((comparison, index) => {
            const comparisonItem = (
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonTitle}>
                  vs {comparison.technology}
                </Text>
                <Text style={styles.comparisonText}>
                  {comparison.comparison}
                </Text>
              </View>
            );

            return ItemWrapper ? (
              <ItemWrapper key={index} index={index}>
                {comparisonItem}
              </ItemWrapper>
            ) : (
              <View key={index}>{comparisonItem}</View>
            );
          })}
        </>
      )}
    </Card>
  );
};
