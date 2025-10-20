import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets, Edge } from 'react-native-safe-area-context';

interface SafeAreaScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  /**
   * Which edges to apply safe area insets to.
   * Default: [] (no edges, since Stack navigation headers handle safe area)
   */
  edges?: readonly Edge[];
  /**
   * Minimum padding to apply even when there's no safe area inset.
   * Useful for devices without notch to still have consistent spacing.
   * Default: 0
   */
  minimumTopPadding?: number;
  /**
   * Additional style for the container
   */
  containerStyle?: ViewStyle;
}

/**
 * A ScrollView wrapper that automatically handles safe area insets.
 * Prevents content from being hidden behind the Dynamic Island/notch on iPhone devices.
 *
 * @example
 * ```tsx
 * <SafeAreaScrollView>
 *   <YourContent />
 * </SafeAreaScrollView>
 * ```
 *
 * @example With minimum padding for consistency
 * ```tsx
 * <SafeAreaScrollView minimumTopPadding={20}>
 *   <YourContent />
 * </SafeAreaScrollView>
 * ```
 */
export const SafeAreaScrollView: React.FC<SafeAreaScrollViewProps> = ({
  children,
  edges = [],
  minimumTopPadding = 0,
  containerStyle,
  contentContainerStyle,
  ...scrollViewProps
}) => {
  const insets = useSafeAreaInsets();

  // Calculate padding for each edge
  const paddingTop = edges.includes('top')
    ? Math.max(insets.top, minimumTopPadding)
    : minimumTopPadding;

  const paddingBottom = edges.includes('bottom') ? insets.bottom : 0;
  const paddingLeft = edges.includes('left') ? insets.left : 0;
  const paddingRight = edges.includes('right') ? insets.right : 0;

  const safeAreaStyle: ViewStyle = {
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
  };

  return (
    <ScrollView
      {...scrollViewProps}
      contentContainerStyle={[
        safeAreaStyle,
        contentContainerStyle,
      ]}
      style={[styles.scrollView, containerStyle, scrollViewProps.style]}
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
});
