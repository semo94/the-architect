import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useCardStyles } from '@/hooks/useComponentStyles';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const styles = useCardStyles();

  return <View style={[styles.card, style]}>{children}</View>;
};
