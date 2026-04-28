import React from 'react';
import { Text } from 'react-native';
import { Card } from '../../common/Card';
import { LinkedText } from '../../common/LinkedText';
import { SkeletonText } from '../../common/SkeletonLoader';
import { useTopicCardStyles } from '../topicCardStyles';

interface Props {
  title: string;
  content?: string;
  isLoading?: boolean;
  ContentWrapper?: React.FC<{ text: string; style: any }>;
  getLinkVariant?: (name: string) => 'owned' | 'discoverable';
  onTopicPress?: (name: string) => void;
}

export const TextSection: React.FC<Props> = ({
  title,
  content,
  isLoading = false,
  ContentWrapper,
  getLinkVariant,
  onTopicPress,
}) => {
  const styles = useTopicCardStyles();

  return (
    <Card style={styles.contentCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {isLoading ? (
        <SkeletonText lines={3} lineHeight={24} />
      ) : ContentWrapper && content ? (
        <ContentWrapper text={content} style={styles.contentText} />
      ) : (
        <LinkedText
          text={content ?? ''}
          style={styles.contentText}
          getLinkVariant={getLinkVariant}
          onTopicPress={onTopicPress}
        />
      )}
    </Card>
  );
};
