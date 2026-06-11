import React from 'react';
import { Text, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/colors';
import { Type, FontFamily } from '../../constants/fonts';
import { Spacing, Radius } from '../../constants/spacing';
import { AnimatedPressable } from './AnimatedPressable';

/**
 * Stitch button system (docs/DESIGN.md §4):
 *
 * - `primary`   — solid ink (black) pill; the default CTA.
 * - `save`      — solid accent pill; RESERVED for logging/saving/
 *                 health-positive actions ("Save to history", "Confirm & log").
 * - `secondary` — transparent pill with a hairline border.
 *
 * Press feedback is a 98% scale (Stitch spec), not an opacity shift.
 * Legacy `ui/Button` stays for the visually-frozen onboarding screens.
 */
export type PillButtonVariant = 'primary' | 'save' | 'secondary';

interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: PillButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  flex?: boolean;
  style?: ViewStyle;
}

export function PillButton({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  flex,
  style,
}: PillButtonProps) {
  const { colors, accent } = useTheme();
  const isInactive = !!(loading || disabled);

  const fill =
    variant === 'primary' ? Colors.ink : variant === 'save' ? accent : 'transparent';
  const labelColor = variant === 'secondary' ? colors.text.primary : Colors.onAccent;

  const containerStyle: ViewStyle = {
    flex: flex ? 1 : undefined,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: fill,
    borderWidth: variant === 'secondary' ? 1 : 0,
    borderColor: variant === 'secondary' ? colors.surface.tertiary : undefined,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    opacity: isInactive ? 0.4 : 1,
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isInactive}
      scaleMin={0.98}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isInactive, busy: !!loading }}
      style={[containerStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={{
              ...Type.bodyLg,
              fontFamily: FontFamily.geistSemiBold,
              color: labelColor,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
