import { useTheme } from '@/contexts/ThemeContext';
import { TopicStatus, TopicType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFilterBarStyles } from './topicsStyles';

interface FilterBarProps {
  statusFilter: TopicStatus | 'all';
  onStatusChange: (status: TopicStatus | 'all') => void;
  typeFilter: TopicType | 'all';
  onTypePress: () => void;
  categoryFilter: string;
  onCategoryPress: () => void;
  activeFiltersCount: number;
  onClearAll: () => void;
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  showIcon?: boolean;
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  active,
  onPress,
  showIcon,
}) => {
  const { colors, styles: themeStyles } = useTheme();
  const styles = useFilterBarStyles();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && themeStyles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {label}
        </Text>
        {showIcon && (
          <Ionicons
            name="chevron-down"
            size={14}
            color={active ? colors.white : colors.text}
          />
        )}
      </View>
    </Pressable>
  );
};

export const FilterBar: React.FC<FilterBarProps> = ({
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypePress,
  categoryFilter,
  onCategoryPress,
  activeFiltersCount,
  onClearAll,
}) => {
  const { colors } = useTheme();
  const styles = useFilterBarStyles();

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Status Filters */}
          <FilterChip
            label="All"
            active={statusFilter === 'all'}
            onPress={() => onStatusChange('all')}
          />
          <FilterChip
            label="Discovered"
            active={statusFilter === 'discovered'}
            onPress={() => onStatusChange('discovered')}
          />
          <FilterChip
            label="Learned"
            active={statusFilter === 'learned'}
            onPress={() => onStatusChange('learned')}
          />
          <FilterChip
            label="Dismissed"
            active={statusFilter === 'dismissed'}
            onPress={() => onStatusChange('dismissed')}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Topic Type Filter */}
          <FilterChip
            label={typeFilter === 'all' ? 'Type' : typeFilter}
            active={typeFilter !== 'all'}
            onPress={onTypePress}
            showIcon
          />

          {/* Category Filter */}
          <FilterChip
            label={categoryFilter === 'all' ? 'Category' : categoryFilter}
            active={categoryFilter !== 'all'}
            onPress={onCategoryPress}
            showIcon
          />
        </ScrollView>
      </View>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <View style={styles.activeFiltersContainer}>
          <View style={styles.activeFiltersRow}>
            <Text style={styles.activeFiltersLabel}>Applied:</Text>

            {statusFilter !== 'all' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  Status: {statusFilter}
                </Text>
                <Pressable onPress={() => onStatusChange('all')}>
                  <Ionicons
                    name="close"
                    size={14}
                    color={colors.primary}
                  />
                </Pressable>
              </View>
            )}

            {typeFilter !== 'all' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Type: {typeFilter}</Text>
                <Pressable onPress={onTypePress}>
                  <Ionicons
                    name="close"
                    size={14}
                    color={colors.primary}
                  />
                </Pressable>
              </View>
            )}

            {categoryFilter !== 'all' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  Category: {categoryFilter}
                </Text>
                <Pressable onPress={onCategoryPress}>
                  <Ionicons
                    name="close"
                    size={14}
                    color={colors.primary}
                  />
                </Pressable>
              </View>
            )}

            <Pressable style={styles.clearAllButton} onPress={onClearAll}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
};
