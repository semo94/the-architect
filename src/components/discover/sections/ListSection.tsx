import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { Card } from '../../common/Card';
import { LinkedText } from '../../common/LinkedText';
import { SkeletonBullet } from '../../common/SkeletonLoader';
import { useTopicCardStyles } from '../topicCardStyles';

interface Props {
  title: string;
  items?: string[];
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  isLoading?: boolean;
  ItemWrapper?: React.FC<{ children: React.ReactNode; index: number }>;
  getLinkVariant?: (name: string) => 'owned' | 'discoverable';
  onTopicPress?: (name: string) => void;
}

export const ListSection: React.FC<Props> = ({
  title,
  items = [],
  iconName,
  iconColor,
  isLoading = false,
  ItemWrapper,
  getLinkVariant,
  onTopicPress,
}) => {
  const styles = useTopicCardStyles();

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
                <View style={styles.bulletPoint}>
                  <Ionicons name={iconName} size={16} color={iconColor} />
                </View>
                <LinkedText
                  text={item}
                  style={styles.listText}
                  getLinkVariant={getLinkVariant}
                  onTopicPress={onTopicPress}
                />
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
