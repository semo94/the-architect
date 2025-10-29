import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useEmptyStateStyles } from './topicsStyles';

type EmptyStateType = 'no-topics' | 'no-results' | 'no-filter-results';

interface EmptyStateProps {
  type: EmptyStateType;
  onClearFilters?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  onClearFilters,
}) => {
  const { colors, styles: themeStyles } = useTheme();
  const styles = useEmptyStateStyles();
  const router = useRouter();

  const getContent = () => {
    switch (type) {
      case 'no-topics':
        return {
          icon: 'search-outline' as const,
          title: 'No topics discovered yet',
          subtitle:
            'Visit the Discover tab to start exploring and building your architectural knowledge',
          showButton: true,
          buttonText: 'Go to Discover',
          onButtonPress: () => router.push('/discover'),
        };

      case 'no-results':
        return {
          icon: 'filter-outline' as const,
          title: 'No topics match your search',
          subtitle: 'Try adjusting your search query or filters to find what you\'re looking for',
          showButton: !!onClearFilters,
          buttonText: 'Clear filters',
          onButtonPress: onClearFilters,
        };

      case 'no-filter-results':
        return {
          icon: 'funnel-outline' as const,
          title: 'No topics match these filters',
          subtitle: 'Try adjusting or clearing your filters to see more results',
          showButton: !!onClearFilters,
          buttonText: 'Clear filters',
          onButtonPress: onClearFilters,
        };

      default:
        return {
          icon: 'search-outline' as const,
          title: 'No topics found',
          subtitle: 'There are no topics to display',
          showButton: false,
        };
    }
  };

  const content = getContent();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={content.icon} size={48} color={colors.primary} />
      </View>

      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.subtitle}>{content.subtitle}</Text>

      {content.showButton && content.onButtonPress && (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && themeStyles.pressed,
          ]}
          onPress={content.onButtonPress}
        >
          <Text style={styles.buttonText}>{content.buttonText}</Text>
        </Pressable>
      )}
    </View>
  );
};
