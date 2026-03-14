import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ToastNotification } from '@/components/common/ToastNotification';
import { useTheme } from '@/contexts/ThemeContext';
import topicService from '@/services/topicService';
import { useAppStore } from '@/store/useAppStore';
import { TopicStatus, TopicType } from '@/types';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryFilterSheet } from './CategoryFilterSheet';
import { EmptyState } from './EmptyState';
import { FilterBar } from './FilterBar';
import {
  FilterSheet,
  topicTypeOptions,
  type FilterOption,
} from './FilterSheet';
import { SearchBar } from './SearchBar';
import { TopicListCard } from './TopicListCard';

export const TopicsScreen: React.FC = () => {
  const { topics, fetchTopics } = useAppStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles } = useTheme();
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    topicId: string;
    undoStatus: 'discovered' | 'dismissed';
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    visible: boolean;
    topicId: string | null;
    topicName: string;
    isLoading: boolean;
  }>({
    visible: false,
    topicId: null,
    topicName: '',
    isLoading: false,
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TopicStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TopicType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');

  // Modal states
  const [typeSheetVisible, setTypeSheetVisible] = useState(false);
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<FilterOption[]>([
    { value: 'all', label: 'All Categories' },
  ]);
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState<Record<string, FilterOption[]>>({});

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const loadTopics = useCallback(
    async (nextPage: number, append: boolean) => {
      setIsFetching(true);
      try {
        const result = await fetchTopics(
          {
            search: debouncedSearchQuery || undefined,
            status: statusFilter,
            topicType: typeFilter === 'all' ? undefined : typeFilter,
            category: categoryFilter === 'all' ? undefined : categoryFilter,
            subcategory: subcategoryFilter === 'all' ? undefined : subcategoryFilter,
            page: nextPage,
            limit: 5,
          },
          append
        );
        setTotalCount(result.total);
      } finally {
        setIsFetching(false);
      }
    },
    [categoryFilter, debouncedSearchQuery, fetchTopics, statusFilter, subcategoryFilter, typeFilter]
  );

  const loadTopicFacets = useCallback(async () => {
    try {
      const facets = await topicService.getTopicFacets();
      setCategoryOptions(facets.categories);
      setSubcategoriesByCategory(facets.subcategoriesByCategory);

      if (
        categoryFilter !== 'all' &&
        !facets.categories.some((option) => option.value === categoryFilter)
      ) {
        setCategoryFilter('all');
        setSubcategoryFilter('all');
        return;
      }

      if (categoryFilter !== 'all' && subcategoryFilter !== 'all') {
        const subcategories = facets.subcategoriesByCategory[categoryFilter] ?? [];
        if (!subcategories.some((option) => option.value === subcategoryFilter)) {
          setSubcategoryFilter('all');
        }
      }
    } catch {
      setCategoryOptions([{ value: 'all', label: 'All Categories' }]);
      setSubcategoriesByCategory({});
    }
  }, [categoryFilter, subcategoryFilter]);

  // Reload when filters change.
  useEffect(() => {
    setPage(1);
    void loadTopics(1, false);
  }, [loadTopics]);

  // Keep a stable ref so the focus effect doesn't re-trigger the filter useEffect.
  const loadTopicsRef = useRef(loadTopics);
  loadTopicsRef.current = loadTopics;

  // Always reload page 1 when the tab gains focus (e.g. returning from Discover/Quiz).
  useFocusEffect(
    useCallback(() => {
      setPage(1);
      void loadTopicsRef.current(1, false);
    }, [])
  );

  useEffect(() => {
    void loadTopicFacets();
  }, [loadTopicFacets]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (subcategoryFilter !== 'all') count++;
    return count;
  }, [statusFilter, typeFilter, categoryFilter, subcategoryFilter]);

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

    setDeleteDialog({
      visible: true,
      topicId,
      topicName: topic.name,
      isLoading: false,
    });
  };

  const handleDeleteCancel = () => {
    if (deleteDialog.isLoading) {
      return;
    }

    setDeleteDialog({
      visible: false,
      topicId: null,
      topicName: '',
      isLoading: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.topicId || deleteDialog.isLoading) {
      return;
    }

    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      await topicService.deleteTopic(deleteDialog.topicId);
      setDeleteDialog({
        visible: false,
        topicId: null,
        topicName: '',
        isLoading: false,
      });
      setPage(1);
      await loadTopics(1, false);
      await loadTopicFacets();
    } catch {
      setDeleteDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleDismiss = async (topicId: string) => {
    await topicService.updateTopicStatus(topicId, 'dismissed');
    setPage(1);
    await Promise.all([loadTopics(1, false), loadTopicFacets()]);

    const topic = topics.find((item) => item.id === topicId);
    setToast({
      message: `"${topic?.name ?? 'Topic'}" dismissed`,
      topicId,
      undoStatus: 'discovered',
    });
  };

  const handleRestore = async (topicId: string) => {
    await topicService.updateTopicStatus(topicId, 'discovered');
    setPage(1);
    await Promise.all([loadTopics(1, false), loadTopicFacets()]);

    const topic = topics.find((item) => item.id === topicId);
    setToast({
      message: `"${topic?.name ?? 'Topic'}" restored to bucket list`,
      topicId,
      undoStatus: 'dismissed',
    });
  };

  const handleUndoToast = async () => {
    if (!toast) {
      return;
    }

    await topicService.updateTopicStatus(toast.topicId, toast.undoStatus);
    setToast(null);
    setPage(1);
    await Promise.all([loadTopics(1, false), loadTopicFacets()]);
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setPage(1);
  };

  const handleCategoryChange = (category: string, subcategory: string) => {
    setCategoryFilter(category);
    setSubcategoryFilter(subcategory);
  };

  const handleClearCategory = () => {
    setCategoryFilter('all');
    setSubcategoryFilter('all');
  };

  const handleClearSubcategory = () => {
    setSubcategoryFilter('all');
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
        resultCount={topics.length}
        totalCount={totalCount}
      />

      <FilterBar
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypePress={handleTypeFilterPress}
        categoryFilter={categoryFilter}
        onCategoryPress={handleCategoryFilterPress}
        subcategoryFilter={subcategoryFilter}
        onClearCategory={handleClearCategory}
        onClearSubcategory={handleClearSubcategory}
        activeFiltersCount={activeFiltersCount}
        onClearAll={handleClearAllFilters}
      />

      {topics.length === 0 ? (
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
          data={topics}
          renderItem={({ item }) => (
            <TopicListCard
              topic={item}
              onPress={handleTopicPress}
              onTest={handleTestKnowledge}
              onDelete={handleDelete}
              onDismiss={handleDismiss}
              onRestore={handleRestore}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 10 }}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (isFetching) return;
            const hasMore = topics.length < totalCount;
            if (!hasMore) return;
            const nextPage = page + 1;
            setPage(nextPage);
            void loadTopics(nextPage, true);
          }}
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
      <CategoryFilterSheet
        visible={categorySheetVisible}
        onClose={() => setCategorySheetVisible(false)}
        categories={categoryOptions}
        subcategoriesByCategory={subcategoriesByCategory}
        selectedCategory={categoryFilter}
        selectedSubcategory={subcategoryFilter}
        onApply={handleCategoryChange}
      />

      <ToastNotification
        message={toast?.message ?? ''}
        visible={!!toast}
        actionLabel="Undo"
        onAction={() => void handleUndoToast()}
        onDismiss={() => setToast(null)}
      />

      <ConfirmDialog
        visible={deleteDialog.visible}
        title="Delete Topic"
        message={`Are you sure you want to delete "${deleteDialog.topicName}"? This will permanently remove the topic and all associated quiz data from your profile.`}
        onCancel={handleDeleteCancel}
        onConfirm={() => void handleDeleteConfirm()}
        cancelText="Cancel"
        confirmText="Delete"
        destructive
        isLoading={deleteDialog.isLoading}
      />
    </View>
  );
};
