import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import type { FilterOption } from './FilterSheet';
import { useFilterSheetStyles } from './topicsStyles';

interface CategoryFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  categories: FilterOption[];
  subcategoriesByCategory: Record<string, FilterOption[]>;
  selectedCategory: string;
  selectedSubcategory: string;
  onApply: (category: string, subcategory: string) => void;
}

export const CategoryFilterSheet: React.FC<CategoryFilterSheetProps> = ({
  visible,
  onClose,
  categories,
  subcategoriesByCategory,
  selectedCategory,
  selectedSubcategory,
  onApply,
}) => {
  const { colors, spacing, typography } = useTheme();
  const styles = useFilterSheetStyles();

  const [tempCategory, setTempCategory] = useState(selectedCategory);
  const [tempSubcategory, setTempSubcategory] = useState(selectedSubcategory);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    selectedCategory !== 'all' ? selectedCategory : null
  );

  // Sync temp state when sheet opens
  useEffect(() => {
    if (visible) {
      setTempCategory(selectedCategory);
      setTempSubcategory(selectedSubcategory);
      setExpandedCategory(selectedCategory !== 'all' ? selectedCategory : null);
    }
  }, [visible, selectedCategory, selectedSubcategory]);

  const handleCategoryPress = (value: string) => {
    if (value === 'all') {
      setTempCategory('all');
      setTempSubcategory('all');
      setExpandedCategory(null);
      return;
    }

    if (tempCategory === value) {
      // Toggle expand/collapse if already selected
      setExpandedCategory(expandedCategory === value ? null : value);
    } else {
      // Select new category and expand it
      setTempCategory(value);
      setTempSubcategory('all');
      setExpandedCategory(value);
    }
  };

  const handleSubcategoryPress = (value: string) => {
    setTempSubcategory(value);
  };

  const handleApply = () => {
    onApply(tempCategory, tempSubcategory);
    onClose();
  };

  const handleCancel = () => {
    setTempCategory(selectedCategory);
    setTempSubcategory(selectedSubcategory);
    onClose();
  };

  const subcategories =
    expandedCategory && expandedCategory !== 'all'
      ? subcategoriesByCategory[expandedCategory] ?? []
      : [];

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
              <Text style={styles.title}>Filter by Category</Text>
            </View>

            <ScrollView
              style={{ maxHeight: 400 }}
              contentContainerStyle={styles.scrollContent}
            >
              {categories.map((option) => {
                const isAllOption = option.value === 'all';
                const isSelected = tempCategory === option.value;
                const isExpanded = expandedCategory === option.value;
                const hasSubcategories =
                  !isAllOption &&
                  (subcategoriesByCategory[option.value]?.length ?? 0) > 1;

                return (
                  <View key={option.value}>
                    {/* Category row */}
                    <TouchableOpacity
                      style={styles.optionButton}
                      onPress={() => handleCategoryPress(option.value)}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          flex: 1,
                        }}
                      >
                        {!isAllOption && hasSubcategories && (
                          <Ionicons
                            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={16}
                            color={colors.textSecondary}
                            style={{ marginRight: spacing.sm }}
                          />
                        )}
                        {!isAllOption && !hasSubcategories && (
                          <View style={{ width: 16 + spacing.sm }} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.optionLabel}>{option.label}</Text>
                          {option.count !== undefined && (
                            <Text style={styles.optionCount}>
                              {option.count}{' '}
                              {option.count === 1 ? 'topic' : 'topics'}
                            </Text>
                          )}
                        </View>
                      </View>
                      {isSelected && tempSubcategory === 'all' && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>

                    {/* Subcategory rows (expanded) */}
                    {isExpanded &&
                      hasSubcategories &&
                      subcategories
                        .filter((sub) => sub.value !== 'all')
                        .map((sub) => {
                        const isSubSelected =
                          isSelected &&
                          tempSubcategory === sub.value;

                        return (
                          <TouchableOpacity
                            key={sub.value}
                            style={[
                              styles.optionButton,
                              {
                                paddingLeft: spacing.xl + 16 + spacing.sm,
                                backgroundColor: colors.background,
                              },
                            ]}
                            onPress={() => handleSubcategoryPress(sub.value)}
                          >
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.optionLabel,
                                  {
                                    fontSize: typography.fontSize.sm,
                                    color: colors.text,
                                  },
                                ]}
                              >
                                {sub.label}
                              </Text>
                              {sub.count !== undefined && (
                                <Text style={styles.optionCount}>
                                  {sub.count}{' '}
                                  {sub.count === 1 ? 'topic' : 'topics'}
                                </Text>
                              )}
                            </View>
                            {isSubSelected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={20}
                                color={colors.primary}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                );
              })}
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
