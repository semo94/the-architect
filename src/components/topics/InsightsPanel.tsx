import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import type { InsightGroup, InsightItem } from '../../types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  status: 'processing' | 'ready' | 'failed';
  groups: InsightGroup[];
  onInsightPress: (item: InsightItem) => void;
  onRetry?: () => void;
}

const GROUP_ORDER = [
  'PREREQUISITE_OF',
  'BUILDS_ON',
  'PART_OF',
  'TYPE_OF',
  'EXAMPLE_OF',
  'IMPLEMENTS',
  'CAUSES',
  'USED_WITH',
  'ALTERNATIVE_TO',
  'SIMILAR_TO',
  'TRADEOFF_WITH',
];

export const InsightsPanel: React.FC<Props> = ({
  visible,
  onDismiss,
  status,
  groups,
  onInsightPress,
  onRetry,
}) => {
  const { colors, spacing, typography } = useTheme();

  const sortedGroups = [...groups].sort((a, b) => {
    const aIdx = GROUP_ORDER.indexOf(a.relationKind);
    const bIdx = GROUP_ORDER.indexOf(b.relationKind);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.cardBackground,
            paddingBottom: spacing.xl,
          },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.title, { color: colors.text }]}>Learning Connections</Text>
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {status === 'processing' && (
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.textSecondary, marginTop: spacing.md }]}>
              Mapping learning connections...
            </Text>
          </View>
        )}

        {status === 'failed' && (
          <View style={styles.centeredContent}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.error ?? '#EF4444'} />
            <Text style={[styles.statusText, { color: colors.textSecondary, marginTop: spacing.md }]}>
              Couldn't load learning connections.
            </Text>
            {onRetry && (
              <TouchableOpacity
                onPress={onRetry}
                style={[styles.retryButton, { backgroundColor: colors.primary, marginTop: spacing.md }]}
              >
                <Text style={[styles.retryText, { color: '#FFFFFF' }]}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {status === 'ready' && (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}
            showsVerticalScrollIndicator={false}
          >
            {sortedGroups.length === 0 ? (
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                No connections found for this topic.
              </Text>
            ) : (
              sortedGroups.map((group) => (
                <View key={group.relationKind} style={{ marginBottom: spacing.lg }}>
                  <Text style={[styles.groupHeading, { color: colors.textSecondary }]}>
                    {group.heading.toUpperCase()}
                  </Text>
                  <View style={styles.chipsRow}>
                    {group.items.map((item) => (
                      <TouchableOpacity
                        key={`${group.relationKind}-${item.targetName}`}
                        onPress={() => onInsightPress(item)}
                        style={[
                          styles.chip,
                          item.owned
                            ? { backgroundColor: colors.primary }
                            : {
                                backgroundColor: 'transparent',
                                borderWidth: 1.5,
                                borderColor: colors.primary,
                              },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: item.owned ? '#FFFFFF' : colors.primary },
                          ]}
                        >
                          {item.owned ? item.targetName : `+ ${item.targetName}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  statusText: {
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  groupHeading: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default InsightsPanel;
