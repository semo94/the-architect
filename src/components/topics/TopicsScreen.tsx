import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useTheme } from '@/contexts/ThemeContext';
import topicService from '@/services/topicService';
import { useAppStore } from '@/store/useAppStore';
import { TopicStatus, TopicType } from '@/types';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const { colors, spacing, typography, borderRadius, styles: themeStyles } = useTheme();
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
  const [subcategorySheetVisible, setSubcategorySheetVisible] = useState(false);
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
            limit: 50,
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

  useEffect(() => {
    setPage(1);
    void loadTopics(1, false);
  }, [loadTopics]);

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

  const subcategoryOptions = useMemo(
    () => {
      if (categoryFilter === 'all') {
        return [];
      }

      return subcategoriesByCategory[categoryFilter] ?? [
        { value: 'all', label: 'All Subcategories' },
      ];
    },
    [categoryFilter, subcategoriesByCategory]
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
    await loadTopics(1, false);
    await loadTopicFacets();

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
    await loadTopics(1, false);
    await loadTopicFacets();

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
    await loadTopics(1, false);
    await loadTopicFacets();
  };

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setPage(1);
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

  const handleSubcategoryFilterPress = () => {
    if (categoryFilter === 'all') {
      return;
    }

    setSubcategorySheetVisible(true);
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
        onSubcategoryPress={handleSubcategoryFilterPress}
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

      {toast && (
        <View
          style={{
            position: 'absolute',
            left: spacing.lg,
            right: spacing.lg,
            bottom: Math.max(insets.bottom + 70, spacing.xl),
            backgroundColor: colors.text,
            borderRadius: borderRadius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              color: colors.background,
              fontSize: typography.fontSize.sm,
              flex: 1,
              marginRight: spacing.sm,
            }}
            numberOfLines={2}
          >
            {toast.message}
          </Text>
          <Pressable onPress={() => void handleUndoToast()}>
            <Text
              style={{
                color: colors.primaryLight,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
              }}
            >
              Undo
            </Text>
          </Pressable>
        </View>
      )}

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
