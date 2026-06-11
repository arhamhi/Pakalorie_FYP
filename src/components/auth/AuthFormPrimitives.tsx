import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  type TextInputProps,
} from 'react-native';
import { router } from 'expo-router';
import { CaretLeftIcon, GoogleLogoIcon } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Type, FontFamily } from '../../constants/fonts';
import { Spacing, Radius } from '../../constants/spacing';
import { Colors } from '../../constants/colors';
import { PillButton } from '../ui/PillButton';

/**
 * Shared atoms for the auth form screens (login / signup / forgot-password).
 *
 * These intentionally sit in `src/components/auth/` rather than in the
 * `(auth)` route group to avoid expo-router treating them as routes.
 * They use the new Geist + 70/20/10 token system from docs/DESIGN.md;
 * they do NOT inherit from v2's `src/components/ui/Button` etc. (those
 * still hardcode PlusJakartaSans for un-migrated screens).
 */

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export function AuthHeader({ title, subtitle, onBack }: AuthHeaderProps) {
  const { colors } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <View style={{ marginBottom: Spacing['2xl'] }}>
      <Pressable
        onPress={handleBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: Radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          marginBottom: Spacing.xl,
          marginLeft: -Spacing.sm,
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <CaretLeftIcon size={24} color={colors.text.primary} weight="regular" />
      </Pressable>

      {/* Stitch: screen headers are Instrument Serif (headlineSerifMd) */}
      <Text style={{ ...Type.headlineSerifMd, color: colors.text.primary }}>{title}</Text>

      {subtitle && (
        <Text
          style={{
            ...Type.bodyLg,
            color: colors.text.secondary,
            marginTop: Spacing.xs,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  rightSlot?: React.ReactNode;
}

export function AuthInput({ label, error, hint, rightSlot, ...textInputProps }: AuthInputProps) {
  const { colors, accent } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  // Stitch inputs: soft fill, borderless at rest; deep-green focus ring,
  // error keeps the system red.
  const borderColor = error
    ? Colors.system.error
    : isFocused
    ? Colors.accentDeep
    : 'transparent';

  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text
        style={{
          ...Type.bodySm,
          fontFamily: FontFamily.geistMedium,
          color: colors.text.secondary,
          marginBottom: Spacing.xs,
        }}
      >
        {label}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor,
          borderRadius: Radius.input,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          backgroundColor: colors.surface.tertiary,
        }}
      >
        <TextInput
          {...textInputProps}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          placeholderTextColor={colors.text.tertiary}
          selectionColor={accent}
          style={{
            flex: 1,
            ...Type.bodyLg,
            color: colors.text.primary,
            paddingVertical: 0, // RN Android adds extra padding by default
          }}
        />
        {rightSlot}
      </View>

      {(error || hint) && (
        <Text
          style={{
            ...Type.bodySm,
            color: error ? Colors.system.error : colors.text.tertiary,
            marginTop: Spacing.xxs,
          }}
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

// Solid-ink Stitch pill (PillButton primary). Public props unchanged so the
// auth screens need no edits.
export function PrimaryButton({ label, onPress, loading, disabled }: PrimaryButtonProps) {
  return <PillButton label={label} onPress={onPress} loading={loading} disabled={disabled} />;
}

interface GoogleButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

// Secondary Stitch pill with the Google glyph.
export function GoogleButton({ onPress, loading, disabled }: GoogleButtonProps) {
  const { colors } = useTheme();

  return (
    <PillButton
      label="Continue with Google"
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      variant="secondary"
      icon={<GoogleLogoIcon size={20} color={colors.text.primary} weight="bold" />}
    />
  );
}

interface DividerProps {
  label: string;
}

export function Divider({ label }: DividerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.xl,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: colors.surface.tertiary }} />
      <Text
        style={{
          ...Type.caption,
          color: colors.text.tertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginHorizontal: Spacing.md,
        }}
      >
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.surface.tertiary }} />
    </View>
  );
}

interface FootLinkProps {
  prompt: string;
  actionLabel: string;
  onPress: () => void;
}

export function FootLink({ prompt, actionLabel, onPress }: FootLinkProps) {
  const { colors, accent } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.xl,
      }}
    >
      <Text style={{ ...Type.bodyMd, color: colors.text.secondary }}>{prompt} </Text>
      <Pressable onPress={onPress} hitSlop={8}>
        <Text
          style={{
            ...Type.bodyMd,
            color: accent,
            fontFamily: FontFamily.geistSemiBold,
          }}
        >
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}
