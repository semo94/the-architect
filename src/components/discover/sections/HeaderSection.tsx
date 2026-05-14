import { useTheme } from '@/contexts/ThemeContext';
import { TopicType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../common/Card';
import { SkeletonLoader } from '../../common/SkeletonLoader';
import { useTopicCardStyles } from '../topicCardStyles';

interface Props {
  category?: string;
  subcategory?: string;
  name?: string;
  topicType?: TopicType;
  isLoading?: boolean;
  LoadingWrapper?: React.FC<{ children: React.ReactNode }>;
  /**
   * Marks the card as a discovery preview (no hyperlinks resolved, no
   * insights). Renders a non-interactive "Preview" pill above the category
   * label so the user has an explicit visual signal that this is a transient
   * view of an unowned topic, distinct from the canonical topic detail.
   *
   * The pill is intentionally NOT tappable: ownership transitions are owned
   * by the action buttons (Add to Bucket / Acquire Now), which both replace
   * the preview with /topic-detail. Having a second affordance with the same
   * effect was redundant and conceptually confusing.
   */
  isPreview?: boolean;
}

export const HeaderSection: React.FC<Props> = ({
  category,
  subcategory,
  name,
  topicType,
  isLoading = false,
  LoadingWrapper,
  isPreview = false,
}) => {
  const styles = useTopicCardStyles();
  const { colors, typography, spacing, isDark } = useTheme();

  const previewStyles = React.useMemo(
    () =>
      StyleSheet.create({
        pillRow: {
          flexDirection: 'row',
          marginBottom: spacing.sm,
        },
        pill: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          paddingHorizontal: spacing.md,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: isDark ? colors.primaryDark + '33' : 'rgba(255,255,255,0.18)',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isDark ? colors.primaryDark : 'rgba(255,255,255,0.4)',
        },
        pillText: {
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.semibold,
          color: isDark ? colors.primaryDark : colors.white,
          letterSpacing: 0.5,
        },
      }),
    [colors, typography, spacing, isDark]
  );

  const PreviewPill = () => {
    if (!isPreview) return null;

    return (
      <View style={previewStyles.pillRow}>
        <View style={previewStyles.pill} accessibilityRole="text" accessibilityLabel="Preview">
          <Ionicons
            name="eye-outline"
            size={12}
            color={isDark ? colors.primaryDark : colors.white}
          />
          <Text style={[previewStyles.pillText, { marginLeft: 4 }]}>PREVIEW</Text>
        </View>
      </View>
    );
  };

  const content = isLoading ? (
    <>
      <SkeletonLoader width="60%" height={14} style={{ marginBottom: spacing.sm }} />
      <SkeletonLoader width="80%" height={28} />
    </>
  ) : (
    <>
      <PreviewPill />
      <Text style={styles.categoryLabel}>
        {category} › {subcategory}
      </Text>
      <Text style={styles.title}>{name}</Text>
    </>
  );

  return (
    <Card style={styles.headerCard}>
      {LoadingWrapper && !isLoading ? (
        <LoadingWrapper>{content}</LoadingWrapper>
      ) : (
        content
      )}
    </Card>
  );
};
