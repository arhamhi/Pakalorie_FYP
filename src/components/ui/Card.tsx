import React from 'react';
import { View, ViewStyle, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

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
    borderRadius: 16,
    overflow: 'hidden',
    padding: getPadding(),
  };

  // Light mode gets shadows and borders for visual separation
  const lightModeElevation: ViewStyle = theme === 'light' ? {
    backgroundColor: colors.surface.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
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
          style={[baseStyle, style]}
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
