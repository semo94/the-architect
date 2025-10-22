import React from 'react';
import { Text } from 'react-native';
import { Card } from '../../common/Card';
import { SkeletonLoader } from '../../common/SkeletonLoader';
import { useTopicCardStyles } from '../topicCardStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { TopicType } from '@/types';

interface Props {
  category?: string;
  subcategory?: string;
  name?: string;
  topicType?: TopicType;
  isLoading?: boolean;
  LoadingWrapper?: React.FC<{ children: React.ReactNode }>;
}

export const HeaderSection: React.FC<Props> = ({
  category,
  subcategory,
  name,
  topicType,
  isLoading = false,
  LoadingWrapper,
}) => {
  const styles = useTopicCardStyles();
  const { spacing } = useTheme();

  const content = isLoading ? (
    <>
      <SkeletonLoader width="60%" height={14} style={{ marginBottom: spacing.sm }} />
      <SkeletonLoader width="80%" height={28} />
    </>
  ) : (
    <>
      <Text style={styles.categoryLabel}>
        {category} › {subcategory}
      </Text>
      <Text style={styles.title}>{name}</Text>
    </>
  );

  return (
    <Card style={styles.headerCard}>
      {LoadingWrapper && !isLoading ? (
        <LoadingWrapper>{content}</LoadingWrapper>
      ) : (
        content
      )}
    </Card>
  );
};
