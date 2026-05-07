import React, { useEffect } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingBackgroundProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'warm';
}

// Floating orb component with subtle animation
const FloatingOrb: React.FC<{
  size: number;
  color: string;
  initialX: number;
  initialY: number;
  delay?: number;
  duration?: number;
}> = ({ size, color, initialX, initialY, delay = 0, duration = 8000 }) => {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Subtle floating animation
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );

    // Subtle pulse
    scale.value = withDelay(
      delay + 500,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 0.5, 1], [0, 20, 0]);
    const translateY = interpolate(progress.value, [0, 0.5, 1], [0, -30, 0]);

    return {
      transform: [
        { translateX },
        { translateY },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: initialX,
          top: initialY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

// Gradient mesh effect
const GradientMesh: React.FC<{ colors: any; accent: string }> = ({ colors, accent }) => {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Primary gradient blob - top right */}
      <View
        style={{
          position: 'absolute',
          top: -SCREEN_HEIGHT * 0.15,
          right: -SCREEN_WIDTH * 0.3,
          width: SCREEN_WIDTH * 0.8,
          height: SCREEN_WIDTH * 0.8,
          borderRadius: SCREEN_WIDTH * 0.4,
          backgroundColor: accent,
          opacity: 0.08,
        }}
      />
      
      {/* Secondary gradient blob - bottom left */}
      <View
        style={{
          position: 'absolute',
          bottom: -SCREEN_HEIGHT * 0.1,
          left: -SCREEN_WIDTH * 0.25,
          width: SCREEN_WIDTH * 0.6,
          height: SCREEN_WIDTH * 0.6,
          borderRadius: SCREEN_WIDTH * 0.3,
          backgroundColor: accent,
          opacity: 0.06,
        }}
      />

      {/* Accent blob - middle */}
      <View
        style={{
          position: 'absolute',
          top: SCREEN_HEIGHT * 0.4,
          right: -SCREEN_WIDTH * 0.2,
          width: SCREEN_WIDTH * 0.5,
          height: SCREEN_WIDTH * 0.5,
          borderRadius: SCREEN_WIDTH * 0.25,
          backgroundColor: accent,
          opacity: 0.04,
        }}
      />
    </View>
  );
};

// Grid pattern overlay
const GridPattern: React.FC<{ colors: any }> = ({ colors }) => {
  const gridSize = 60;
  const rows = Math.ceil(SCREEN_HEIGHT / gridSize);
  const cols = Math.ceil(SCREEN_WIDTH / gridSize);

  return (
    <View style={[StyleSheet.absoluteFill, { opacity: 0.03 }]}>
      {/* Horizontal lines */}
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={`h-${i}`}
          style={{
            position: 'absolute',
            top: i * gridSize,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: colors.text.primary,
          }}
        />
      ))}
      {/* Vertical lines */}
      {Array.from({ length: cols }).map((_, i) => (
        <View
          key={`v-${i}`}
          style={{
            position: 'absolute',
            left: i * gridSize,
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: colors.text.primary,
          }}
        />
      ))}
    </View>
  );
};

export const OnboardingBackground: React.FC<OnboardingBackgroundProps> = ({
  children,
  variant = 'default',
}) => {
  const { colors, accent, theme } = useTheme();

  // Determine orb colors based on variant
  const getOrbColors = () => {
    switch (variant) {
      case 'accent':
        return [accent + '30', accent + '20', accent + '15'];
      case 'warm':
        return ['#FFC10720', '#FF6B6B15', accent + '15'];
      default:
        return [accent + '20', accent + '15', accent + '10'];
    }
  };

  const orbColors = getOrbColors();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.primary }}>
      {/* Background layers */}
      <View style={StyleSheet.absoluteFill}>
        {/* Gradient mesh */}
        <GradientMesh colors={colors} accent={accent} />

        {/* Subtle grid pattern */}
        <GridPattern colors={colors} />

        {/* Floating orbs */}
        <FloatingOrb
          size={200}
          color={orbColors[0]}
          initialX={SCREEN_WIDTH * 0.6}
          initialY={SCREEN_HEIGHT * 0.08}
          delay={0}
          duration={10000}
        />
        <FloatingOrb
          size={150}
          color={orbColors[1]}
          initialX={-SCREEN_WIDTH * 0.1}
          initialY={SCREEN_HEIGHT * 0.35}
          delay={2000}
          duration={12000}
        />
        <FloatingOrb
          size={120}
          color={orbColors[2]}
          initialX={SCREEN_WIDTH * 0.7}
          initialY={SCREEN_HEIGHT * 0.65}
          delay={4000}
          duration={9000}
        />
        <FloatingOrb
          size={80}
          color={orbColors[0]}
          initialX={SCREEN_WIDTH * 0.15}
          initialY={SCREEN_HEIGHT * 0.75}
          delay={1000}
          duration={11000}
        />

        {/* Blur overlay for depth */}
        <BlurView
          intensity={theme === 'dark' ? 40 : 60}
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        {/* Noise texture overlay (simulated with opacity) */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.surface.primary,
              opacity: 0.7,
            },
          ]}
        />
      </View>

      {/* Content */}
      {children}
    </View>
  );
};

export default OnboardingBackground;
