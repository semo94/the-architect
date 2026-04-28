import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { Text, View } from 'react-native';
import { Card } from '../../common/Card';
import { LinkedText } from '../../common/LinkedText';
import { SkeletonLoader, SkeletonText } from '../../common/SkeletonLoader';
import { useTopicCardStyles } from '../topicCardStyles';

interface Comparison {
  topic: string;
  comparison: string;
}

interface Props {
  comparisons?: Comparison[];
  isLoading?: boolean;
  ItemWrapper?: React.FC<{ children: React.ReactNode; index: number }>;
  getLinkVariant?: (name: string) => 'owned' | 'discoverable';
  onTopicPress?: (name: string) => void;
}

export const ComparisonSection: React.FC<Props> = ({
  comparisons = [],
  isLoading = false,
  ItemWrapper,
  getLinkVariant,
  onTopicPress,
}) => {
  const styles = useTopicCardStyles();
  const { spacing } = useTheme();

  return (
    <Card style={styles.contentCard}>
      <Text style={styles.sectionTitle}>Compare To Similar</Text>
      {isLoading ? (
        <>
          <View style={styles.comparisonItem}>
            <SkeletonLoader width="40%" height={16} style={{ marginBottom: spacing.sm }} />
            <SkeletonText lines={2} lineHeight={22} lastLineWidth="85%" />
          </View>
          <View style={styles.comparisonItem}>
            <SkeletonLoader width="45%" height={16} style={{ marginBottom: spacing.sm }} />
            <SkeletonText lines={2} lineHeight={22} lastLineWidth="75%" />
          </View>
        </>
      ) : (
        <>
          {comparisons.map((comparison, index) => {
            const comparisonItem = (
              <View style={styles.comparisonItem}>
                <LinkedText
                  text={`vs ${comparison.topic}`}
                  style={styles.comparisonTitle}
                  getLinkVariant={getLinkVariant}
                  onTopicPress={onTopicPress}
                />
                <Text style={styles.comparisonText}>{comparison.comparison}</Text>
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
