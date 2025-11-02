import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useFilterSheetStyles } from './topicsStyles';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: FilterOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export const FilterSheet: React.FC<FilterSheetProps> = ({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
}) => {
  const { colors } = useTheme();
  const styles = useFilterSheetStyles();
  const [tempSelection, setTempSelection] = useState(selectedValue);

  const handleApply = () => {
    onSelect(tempSelection);
    onClose();
  };

  const handleCancel = () => {
    setTempSelection(selectedValue);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Animated.View
          entering={SlideInDown.duration(300)}
          style={styles.sheetContainer}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
            </View>

            <ScrollView
              style={{ maxHeight: 400 }}
              contentContainerStyle={styles.scrollContent}
            >
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.optionButton}
                  onPress={() => setTempSelection(option.value)}
                >
                  <View style={styles.optionLeft}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {option.count !== undefined && (
                      <Text style={styles.optionCount}>
                        {option.count} {option.count === 1 ? 'topic' : 'topics'}
                      </Text>
                    )}
                  </View>
                  {tempSelection === option.value && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.buttonContainer}>
              <Pressable
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleCancel}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleApply}
              >
                <Text style={[styles.buttonText, styles.buttonTextPrimary]}>
                  Apply
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// Topic Type options
export const topicTypeOptions: FilterOption[] = [
  { value: 'all', label: 'All Types' },
  { value: 'concepts', label: 'Concepts' },
  { value: 'patterns', label: 'Patterns' },
  { value: 'technologies', label: 'Technologies' },
  { value: 'strategies', label: 'Strategies' },
  { value: 'models', label: 'Models' },
  { value: 'frameworks', label: 'Frameworks' },
  { value: 'protocols', label: 'Protocols' },
  { value: 'practices', label: 'Practices' },
  { value: 'methodologies', label: 'Methodologies' },
  { value: 'architectures', label: 'Architectures' },
];

// Helper to generate category options from topics
export const generateCategoryOptions = (
  topics: { category: string }[]
): FilterOption[] => {
  const categoryCounts = topics.reduce((acc, topic) => {
    acc[topic.category] = (acc[topic.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const options: FilterOption[] = [
    { value: 'all', label: 'All Categories' },
  ];

  Object.entries(categoryCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([category, count]) => {
      options.push({
        value: category,
        label: category,
        count,
      });
    });

  return options;
};

// Helper to generate subcategory options from topics filtered by category
export const generateSubcategoryOptions = (
  topics: { category: string; subcategory: string }[],
  selectedCategory: string
): FilterOption[] => {
  const filteredTopics = topics.filter((t) => t.category === selectedCategory);

  const subcategoryCounts = filteredTopics.reduce((acc, topic) => {
    acc[topic.subcategory] = (acc[topic.subcategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const options: FilterOption[] = [
    { value: 'all', label: 'All Subcategories' },
  ];

  Object.entries(subcategoryCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([subcategory, count]) => {
      options.push({
        value: subcategory,
        label: subcategory,
        count,
      });
    });

  return options;
};
