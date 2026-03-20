import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { Card } from '../../common/Card';
import { SkeletonLoader } from '../../common/SkeletonLoader';
import { useTopicCardStyles } from '../topicCardStyles';

interface LearningResource {
  title: string;
  url: string;
}

interface Props {
  resources?: LearningResource[];
  isLoading?: boolean;
  ItemWrapper?: React.FC<{ children: React.ReactNode; index: number }>;
}

const openLink = async (url: string) => {
  if (Platform.OS === 'web') {
    await Linking.openURL(url);
  } else {
    await WebBrowser.openBrowserAsync(url);
  }
};

function extractDomain(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return url;
  }
}

export const LearningResourcesSection: React.FC<Props> = ({
  resources = [],
  isLoading = false,
  ItemWrapper,
}) => {
  const styles = useTopicCardStyles();
  const { spacing } = useTheme();

  return (
    <Card style={styles.contentCard}>
      <Text style={styles.sectionTitle}>Learning Resources</Text>
      {isLoading ? (
        <>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.resourceItem, { marginBottom: spacing.sm }]}>
              <View style={{ flex: 1 }}>
                <SkeletonLoader width="80%" height={14} style={{ marginBottom: 6 }} />
                <SkeletonLoader width="50%" height={11} />
              </View>
            </View>
          ))}
        </>
      ) : (
        <>
          {resources.slice(0, 5).map((resource, index) => {
            const item = (
              <Pressable
                style={({ pressed }) => [
                  styles.resourceItem,
                  pressed && styles.resourceItemPressed,
                ]}
                onPress={() => openLink(resource.url)}
                accessibilityRole="link"
                accessibilityLabel={resource.title}
              >
                <Ionicons
                  name="link-outline"
                  size={18}
                  color={styles.resourceTitle.color as string}
                  style={styles.resourceIconLeft}
                />
                <View style={styles.resourceTextContainer}>
                  <Text style={styles.resourceTitle} numberOfLines={2}>
                    {resource.title}
                  </Text>
                  <Text style={styles.resourceDomain} numberOfLines={1}>
                    {extractDomain(resource.url)}
                  </Text>
                </View>
                <Ionicons
                  name="open-outline"
                  size={14}
                  color={styles.resourceDomain.color as string}
                  style={styles.resourceIconRight}
                />
              </Pressable>
            );

            return ItemWrapper ? (
              <ItemWrapper key={index} index={index}>
                {item}
              </ItemWrapper>
            ) : (
              <View key={index}>{item}</View>
            );
          })}
        </>
      )}
    </Card>
  );
};
