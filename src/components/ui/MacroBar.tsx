import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily } from '../../constants/fonts';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color?: string;
  style?: ViewStyle;
}

export const MacroBar: React.FC<MacroBarProps> = ({
  label,
  current,
  target,
  unit = 'g',
  color,
  style,
}) => {
  const { colors, accent, theme } = useTheme();
  const progress = useSharedValue(0);

  React.useEffect(() => {
    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    progress.value = withTiming(percentage, { duration: 800 });
  }, [current, target]);

  const animatedWidth = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const barColor = color || accent;
  const remaining = Math.max(target - current, 0);

  return (
    <View style={[{ marginVertical: 6 }, style]}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            fontFamily: FontFamily.geistMedium,
            fontSize: 14,
            color: colors.text.secondary,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: FontFamily.geistMedium,
            fontSize: 14,
            color: colors.text.primary,
          }}
        >
          {current}{unit} / {target}{unit}
        </Text>
      </View>
      <View
        style={{
          height: 8,
          backgroundColor: theme === 'dark' ? colors.surface.tertiary : colors.surface.tertiary,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              backgroundColor: barColor,
              borderRadius: 4,
            },
            animatedWidth,
          ]}
        />
      </View>
    </View>
  );
};
