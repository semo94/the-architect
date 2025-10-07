import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../../common/Card';
import { SkeletonBullet } from '../../common/SkeletonLoader';
import { technologyCardStyles } from '../technologyCardStyles';

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
  return (
    <Card style={technologyCardStyles.contentCard}>
      <Text style={technologyCardStyles.sectionTitle}>{title}</Text>
      {isLoading ? (
        <SkeletonBullet count={4} />
      ) : (
        <>
          {items.map((item, index) => {
            const listItem = (
              <View style={technologyCardStyles.listItem}>
                <Text style={technologyCardStyles.bulletPoint}>{bulletPoint}</Text>
                <Text style={technologyCardStyles.listText}>{item}</Text>
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
