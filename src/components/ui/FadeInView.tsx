import React, { ReactNode } from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  SlideInRight,
  SlideInLeft,
  LayoutAnimationBuilder,
} from 'react-native-reanimated';

/**
 * Props for the FadeInView component.
 */
interface FadeInViewProps {
  children: ReactNode;
  /** Delay before animation starts (in milliseconds). Applied to all direction types. */
  delay?: number;
  /** 
   * Duration of the animation (in milliseconds). 
   * NOTE: This prop only affects the animation when direction is 'none' (default FadeIn).
   * When direction is 'up', 'down', 'left', or 'right', the component uses spring-based
   * animations (FadeInUp, FadeInDown, SlideInLeft, SlideInRight) which ignore this value
   * and use spring physics (damping, mass, stiffness) instead.
   */
  duration?: number;
  style?: StyleProp<ViewStyle>;
  /** 
   * Direction of the entering animation.
   * - 'up' | 'down' | 'left' | 'right': Uses spring-based animations (ignores duration)
   * - 'none': Uses timing-based FadeIn animation (respects duration)
   */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
}

/**
 * A view component that animates its children on mount.
 * 
 * When using directional animations ('up', 'down', 'left', 'right'), spring physics
 * are used and the `duration` prop is ignored. Only the 'none' direction uses
 * timing-based animation that respects the `duration` prop.
 */
export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  delay = 0,
  duration = 500,
  style,
  direction = 'down',
  distance = 20,
}) => {
  let enteringAnimation;

  // Configure base animation
  switch (direction) {
    case 'up':
      enteringAnimation = FadeInUp.springify().damping(12).mass(1).stiffness(100).delay(delay);
      break;
    case 'down':
      enteringAnimation = FadeInDown.springify().damping(12).mass(1).stiffness(100).delay(delay);
      break;
    case 'left':
      enteringAnimation = SlideInLeft.springify().damping(12).mass(1).stiffness(100).delay(delay);
      break;
    case 'right':
      enteringAnimation = SlideInRight.springify().damping(12).mass(1).stiffness(100).delay(delay);
      break;
    default:
      enteringAnimation = FadeIn.duration(duration).delay(delay);
      break;
  }

  return (
    <Animated.View entering={enteringAnimation} style={style}>
      {children}
    </Animated.View>
  );
};
