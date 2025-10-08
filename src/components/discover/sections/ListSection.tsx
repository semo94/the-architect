import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../../common/Card';
import { SkeletonBullet } from '../../common/SkeletonLoader';
import { useTechnologyCardStyles } from '../technologyCardStyles';

interface Props {
  title: string;
  items?: string[];
  bulletPoint: string;
  isLoading?: boolean;
  ItemWrapper?: React.FC<{ children: React.ReactNode; index: number }>;
}

export const ListSection: React.FC<Props> = ({
  title,
  items = [],
  bulletPoint,
  isLoading = false,
  ItemWrapper,
}) => {
  const styles = useTechnologyCardStyles();

  return (
    <Card style={styles.contentCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {isLoading ? (
        <SkeletonBullet count={4} />
      ) : (
        <>
          {items.map((item, index) => {
            const listItem = (
              <View style={styles.listItem}>
                <Text style={styles.bulletPoint}>{bulletPoint}</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            );

            return ItemWrapper ? (
              <ItemWrapper key={index} index={index}>
                {listItem}
              </ItemWrapper>
            ) : (
              <View key={index}>{listItem}</View>
            );
          })}
        </>
      )}
    </Card>
  );
};
