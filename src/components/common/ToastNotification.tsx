import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ToastNotificationProps {
  /** The message to display. */
  message: string;
  /** Controls visibility. When set to false, the toast hides. */
  visible: boolean;
  /** Called when the toast finishes dismissing (auto or via action). */
  onDismiss?: () => void;
  /** Label for the optional inline action button (e.g. "Undo"). */
  actionLabel?: string;
  /** Called when the action button is pressed. */
  onAction?: () => void;
  /** How long (ms) before auto-dismiss. 0 disables auto-dismiss. Defaults to 4000. */
  duration?: number;
  /**
   * Extra bottom offset added on top of the safe area inset.
   * Useful to clear a tab bar. Defaults to 70.
   */
  bottomOffset?: number;
}

export function ToastNotification({
  message,
  visible,
  onDismiss,
  actionLabel,
  onAction,
  duration = 4000,
  bottomOffset = 70,
}: ToastNotificationProps) {
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isShownRef = useRef(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Store callbacks in refs so they never become effect/callback dependencies.
  // This prevents stale-closure race conditions where a hide animation triggered
  // during a re-render fires onDismiss() after the toast has already become visible.
  const onDismissRef = useRef(onDismiss);
  const onActionRef = useRef(onAction);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
  useEffect(() => { onActionRef.current = onAction; }, [onAction]);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopAnimation = React.useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
  }, []);

  const show = React.useCallback(() => {
    clearTimer();
    stopAnimation();
    isShownRef.current = true;

    const animation = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]);

    animationRef.current = animation;
    animation.start(({ finished }) => {
      if (animationRef.current === animation) {
        animationRef.current = null;
      }

      if (!finished) {
        return;
      }
    });
  }, [opacity, translateY, stopAnimation]);

  // hide is stable — opacity/translateY are refs (never change), no onDismiss dep.
  const hide = React.useCallback(() => {
    if (!isShownRef.current) {
      return;
    }

    clearTimer();
    stopAnimation();
    isShownRef.current = false;

    const animation = Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 12, duration: 180, useNativeDriver: true }),
    ]);

    animationRef.current = animation;
    animation.start(({ finished }) => {
      if (animationRef.current === animation) {
        animationRef.current = null;
      }

      if (!finished) {
        return;
      }

      onDismissRef.current?.();
    });
  }, [opacity, translateY, stopAnimation]);

  useEffect(() => {
    if (visible) {
      show();

      if (duration > 0) {
        timerRef.current = setTimeout(hide, duration);
      }
    } else {
      hide();
    }

    return clearTimer;
  }, [visible, duration, hide, show]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopAnimation();
    };
  }, [stopAnimation]);

  const handleAction = () => {
    clearTimer();
    onActionRef.current?.();
    hide();
  };

  const styles = useStyles();
  const bottomPosition = Math.max(insets.bottom + bottomOffset, spacing.xl);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        { bottom: bottomPosition, opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>

      {actionLabel ? (
        <>
          <View style={styles.divider} />
          <Pressable
            onPress={handleAction}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </Pressable>
        </>
      ) : null}
    </Animated.View>
  );
}

function useStyles() {
  const { colors, spacing, typography, borderRadius } = useTheme();

  return React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          backgroundColor: colors.cardBackground,
          borderRadius: borderRadius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 52,
        },
        message: {
          color: colors.text,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          lineHeight: typography.lineHeight.normal,
          flex: 1,
        },
        divider: {
          width: StyleSheet.hairlineWidth,
          height: 20,
          backgroundColor: colors.border,
          marginHorizontal: spacing.md,
        },
        action: {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.xs,
        },
        actionPressed: {
          opacity: 0.5,
        },
        actionLabel: {
          color: colors.primary,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
        },
      }),
    [colors, spacing, typography, borderRadius]
  );
}
