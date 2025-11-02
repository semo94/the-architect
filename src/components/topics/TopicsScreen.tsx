import { useTheme } from '@/contexts/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import { TopicStatus, TopicType } from '@/types';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from './EmptyState';
import { FilterBar } from './FilterBar';
import {
  FilterSheet,
  generateCategoryOptions,
  generateSubcategoryOptions,
  topicTypeOptions,
} from './FilterSheet';
import { SearchBar } from './SearchBar';
import { TopicListCard } from './TopicListCard';

export const TopicsScreen: React.FC = () => {
  const { topics, dismissedTopics, deleteTopic } = useAppStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles } = useTheme();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TopicStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TopicType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');

  // Modal states
  const [typeSheetVisible, setTypeSheetVisible] = useState(false);
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);
  const [subcategorySheetVisible, setSubcategorySheetVisible] = useState(false);

  // Filter logic with useMemo for performance
  const filteredTopics = useMemo(() => {
    return topics.filter((topic) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.subcategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.topicType.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'dismissed') {
          matchesStatus = dismissedTopics.includes(topic.name);
        } else {
          matchesStatus = topic.status === statusFilter;
        }
      }

      // Topic type filter
      const matchesType = typeFilter === 'all' || topic.topicType === typeFilter;

      // Category filter
      const matchesCategory =
        categoryFilter === 'all' || topic.category === categoryFilter;

      // Subcategory filter
      const matchesSubcategory =
        subcategoryFilter === 'all' || topic.subcategory === subcategoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesCategory &&
        matchesSubcategory
      );
    });
  }, [topics, searchQuery, statusFilter, typeFilter, categoryFilter, subcategoryFilter]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (subcategoryFilter !== 'all') count++;
    return count;
  }, [statusFilter, typeFilter, categoryFilter, subcategoryFilter]);

  // Generate dynamic filter options
  const categoryOptions = useMemo(() => generateCategoryOptions(topics), [topics]);

  const subcategoryOptions = useMemo(
    () =>
      categoryFilter !== 'all'
        ? generateSubcategoryOptions(topics, categoryFilter)
        : [],
    [topics, categoryFilter]
  );

  // Handlers
  const handleTopicPress = (topicId: string) => {
    router.push({
      pathname: '/topic-detail',
      params: { topicId },
    });
  };

  const handleTestKnowledge = (topicId: string) => {
    router.push({
      pathname: '/quiz',
      params: { topicId },
    });
  };

  const handleDelete = (topicId: string) => {
    const topic = topics.find((t) => t.id === topicId);
    if (!topic) return;

    Alert.alert(
      'Delete Topic',
      `Are you sure you want to delete "${topic.name}"? This will permanently remove the topic and all associated quiz data from your profile.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTopic(topicId),
        },
      ]
    );
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
  };

  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category);
    // Reset subcategory when category changes
    if (category === 'all') {
      setSubcategoryFilter('all');
    }
  };

  const handleTypeFilterPress = () => {
    setTypeSheetVisible(true);
  };

  const handleCategoryFilterPress = () => {
    setCategorySheetVisible(true);
  };

  // Determine empty state type
  const getEmptyStateType = (): 'no-topics' | 'no-results' | 'no-filter-results' => {
    if (topics.length === 0) return 'no-topics';
    if (searchQuery.length > 0) return 'no-results';
    return 'no-filter-results';
  };

  return (
    <View
      style={[
        themeStyles.container,
        { paddingTop: Math.max(insets.top, 20) },
      ]}
    >
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        resultCount={filteredTopics.length}
        totalCount={topics.length}
      />

      <FilterBar
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypePress={handleTypeFilterPress}
        categoryFilter={categoryFilter}
        onCategoryPress={handleCategoryFilterPress}
        activeFiltersCount={activeFiltersCount}
        onClearAll={handleClearAllFilters}
      />

      {filteredTopics.length === 0 ? (
        <EmptyState
          type={getEmptyStateType()}
          onClearFilters={
            activeFiltersCount > 0 || searchQuery.length > 0
              ? handleClearAllFilters
              : undefined
          }
        />
      ) : (
        <FlatList
          data={filteredTopics}
          renderItem={({ item }) => (
            <TopicListCard
              topic={item}
              onPress={handleTopicPress}
              onTest={handleTestKnowledge}
              onDelete={handleDelete}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 10 }}
        />
      )}

      {/* Type Filter Sheet */}
      <FilterSheet
        visible={typeSheetVisible}
        onClose={() => setTypeSheetVisible(false)}
        title="Filter by Type"
        options={topicTypeOptions}
        selectedValue={typeFilter}
        onSelect={(value) => setTypeFilter(value as TopicType | 'all')}
      />

      {/* Category Filter Sheet */}
      <FilterSheet
        visible={categorySheetVisible}
        onClose={() => setCategorySheetVisible(false)}
        title="Filter by Category"
        options={categoryOptions}
        selectedValue={categoryFilter}
        onSelect={handleCategoryChange}
      />

      {/* Subcategory Filter Sheet (if category is selected) */}
      {categoryFilter !== 'all' && (
        <FilterSheet
          visible={subcategorySheetVisible}
          onClose={() => setSubcategorySheetVisible(false)}
          title="Filter by Subcategory"
          options={subcategoryOptions}
          selectedValue={subcategoryFilter}
          onSelect={(value) => setSubcategoryFilter(value)}
        />
      )}
    </View>
  );
};
