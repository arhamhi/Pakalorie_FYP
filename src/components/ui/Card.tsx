import React from 'react';
import { View, ViewStyle, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';
import { Elevation } from '../../constants/colors';
import { Radius } from '../../constants/spacing';

interface CardProps {
  children: React.ReactNode;
  variant?: 'solid' | 'blur';
  onPress?: () => void;
  style?: ViewStyle;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'solid',
  onPress,
  style,
  padding = 'md',
}) => {
  const { colors, theme } = useTheme();

  const getPadding = (): number => {
    const paddings = { none: 0, sm: 12, md: 16, lg: 24 };
    return paddings[padding];
  };

  const baseStyle: ViewStyle = {
    borderRadius: Radius.card,
    padding: getPadding(),
  };

  // Stitch: cards float on the tinted background via ambient shadow —
  // no hard borders (Elevation.ambient carries the Android fallback).
  const lightModeElevation: ViewStyle = theme === 'light' ? {
    backgroundColor: colors.surface.secondary,
    ...Elevation.ambient,
  } : {
    backgroundColor: colors.surface.secondary,
  };

  const solidStyle: ViewStyle = {
    ...baseStyle,
    ...lightModeElevation,
  };

  const Container = onPress ? TouchableOpacity : View;

  if (variant === 'blur') {
    return (
      <Container onPress={onPress} activeOpacity={0.9}>
        <BlurView
          intensity={80}
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={[baseStyle, { overflow: 'hidden' }, style]}
        >
          {children}
        </BlurView>
      </Container>
    );
  }

  return (
    <Container
      onPress={onPress}
      activeOpacity={0.9}
      style={[solidStyle, style]}
    >
      {children}
    </Container>
  );
};
