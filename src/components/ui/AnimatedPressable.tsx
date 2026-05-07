import React from 'react';
import { Pressable, PressableProps, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends PressableProps {
  scaleMin?: number;
  springConfig?: WithSpringConfig;
  enableHaptic?: boolean;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  style,
  scaleMin = 0.96,
  springConfig = {
    damping: 10,
    mass: 1,
    stiffness: 300,
  },
  enableHaptic = true,
  onPressIn,
  onPressOut,
  onPress,
  ...props
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (event: any) => {
    scale.value = withSpring(scaleMin, springConfig);
    if (onPressIn) onPressIn(event);
  };

  const handlePressOut = (event: any) => {
    scale.value = withSpring(1, springConfig);
    if (onPressOut) onPressOut(event);
  };
  
  const handlePress = (event: any) => {
      if (enableHaptic) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (onPress) onPress(event);
  }

  return (
    <AnimatedPressableComponent
      {...props}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[style as ViewStyle, animatedStyle]}
    >
      {children}
    </AnimatedPressableComponent>
  );
};
