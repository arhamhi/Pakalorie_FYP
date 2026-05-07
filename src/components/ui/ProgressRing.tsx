import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  withTiming,
  useSharedValue,
  useDerivedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  label?: string;
  value?: string | number;
  unit?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 180,
  strokeWidth = 12,
  showPercentage = false,
  label,
  value,
  unit,
}) => {
  const { colors, accent, theme } = useTheme();
  const animatedProgress = useSharedValue(0);

  React.useEffect(() => {
    animatedProgress.value = withTiming(Math.min(progress, 100), { duration: 1000 });
  }, [progress]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (circumference * animatedProgress.value) / 100;
    return {
      strokeDashoffset,
    };
  });

  const getProgressColor = () => {
    if (progress >= 100) return '#D32F2F'; // Exceeded - show error color
    return accent;
  };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme === 'dark' ? colors.surface.tertiary : colors.surface.tertiary}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={getProgressColor()}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {/* Center Content */}
      <View
        style={{
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {value !== undefined && (
          <Text
            style={{
              fontFamily: 'IBMPlexMono_700Bold',
              fontSize: size * 0.2,
              color: colors.text.primary,
            }}
          >
            {value}
          </Text>
        )}
        {unit && (
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: size * 0.08,
              color: colors.text.tertiary,
              marginTop: 2,
            }}
          >
            {unit}
          </Text>
        )}
        {showPercentage && (
          <Text
            style={{
              fontFamily: 'IBMPlexMono_700Bold',
              fontSize: size * 0.15,
              color: colors.text.primary,
            }}
          >
            {Math.round(progress)}%
          </Text>
        )}
        {label && (
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: size * 0.07,
              color: colors.text.secondary,
              marginTop: 4,
            }}
          >
            {label}
          </Text>
        )}
      </View>
    </View>
  );
};
