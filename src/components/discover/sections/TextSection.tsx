import React from 'react';
import { Text } from 'react-native';
import { Card } from '../../common/Card';
import { SkeletonText } from '../../common/SkeletonLoader';
import { useTechnologyCardStyles } from '../technologyCardStyles';

interface Props {
  title: string;
  content?: string;
  isLoading?: boolean;
  ContentWrapper?: React.FC<{ text: string; style: any }>;
}

export const TextSection: React.FC<Props> = ({
  title,
  content,
  isLoading = false,
  ContentWrapper,
}) => {
  const styles = useTechnologyCardStyles();

  return (
    <Card style={styles.contentCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {isLoading ? (
        <SkeletonText lines={3} lineHeight={24} />
      ) : ContentWrapper && content ? (
        <ContentWrapper text={content} style={styles.contentText} />
      ) : (
        <Text style={styles.contentText}>{content}</Text>
      )}
    </Card>
  );
};
