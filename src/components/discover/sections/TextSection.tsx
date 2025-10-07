import React from 'react';
import { Text } from 'react-native';
import { Card } from '../../common/Card';
import { SkeletonText } from '../../common/SkeletonLoader';
import { technologyCardStyles } from '../technologyCardStyles';

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
  return (
    <Card style={technologyCardStyles.contentCard}>
      <Text style={technologyCardStyles.sectionTitle}>{title}</Text>
      {isLoading ? (
        <SkeletonText lines={3} lineHeight={24} />
      ) : ContentWrapper && content ? (
        <ContentWrapper text={content} style={technologyCardStyles.contentText} />
      ) : (
        <Text style={technologyCardStyles.contentText}>{content}</Text>
      )}
    </Card>
  );
};
