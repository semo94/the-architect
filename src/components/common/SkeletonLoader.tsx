import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SkeletonLoaderProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[{ width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          {
            width: '100%',
            height: '100%',
            borderRadius,
            opacity,
            backgroundColor: colors.border,
          },
        ]}
      />
    </View>
  );
};

interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  lastLineWidth?: DimensionValue;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lineHeight = 20,
  lastLineWidth = '70%',
}) => {
  const { spacing } = useTheme();

  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLoader
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          style={{ marginBottom: spacing.sm }}
        />
      ))}
    </View>
  );
};

interface SkeletonBulletProps {
  count?: number;
}

export const SkeletonBullet: React.FC<SkeletonBulletProps> = ({ count = 4 }) => {
  const { spacing } = useTheme();

  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <SkeletonLoader width={20} height={20} borderRadius={10} />
          <SkeletonLoader
            width={index === count - 1 ? '60%' : '80%'}
            height={18}
            style={{ marginLeft: spacing.md }}
          />
        </View>
      ))}
    </View>
  );
};
