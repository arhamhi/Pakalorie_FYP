import React from 'react';
import { View, Text, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Type } from '../../src/constants/fonts';
import { Spacing, Radius } from '../../src/constants/spacing';

/**
 * Welcome — first-launch entry surface (auth route group).
 *
 * Per docs/DESIGN.md §5: full-bleed surface.secondary, centered logo +
 * tagline + 2 CTA buttons. No image background, no animations — light
 * mode only for P1 Mid.
 */
export default function WelcomeScreen() {
  const { colors, accent } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.primary }}>
      <StatusBar barStyle="dark-content" />

      <View
        style={{
          flex: 1,
          paddingHorizontal: Spacing.xl,
          paddingTop: Spacing['4xl'],
          paddingBottom: Spacing.xl,
          justifyContent: 'space-between',
        }}
      >
        {/* Logo + brand block */}
        <View style={{ alignItems: 'center', marginTop: Spacing['5xl'] }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: Radius.card * 1.5,
              backgroundColor: accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: Spacing.xl,
            }}
          >
            <Text
              style={{
                ...Type.displayLg,
                color: '#FFFFFF',
              }}
            >
              P
            </Text>
          </View>

          <Text
            style={{
              ...Type.displayLg,
              color: colors.text.primary,
              marginBottom: Spacing.sm,
              textAlign: 'center',
            }}
          >
            Pakalorie
          </Text>

          <Text
            style={{
              ...Type.bodyLg,
              color: colors.text.secondary,
              textAlign: 'center',
              maxWidth: 280,
            }}
          >
            Smarter nutrition, one bite at a time.
          </Text>
        </View>

        {/* CTAs + disclaimer */}
        <View>
          <Pressable
            onPress={() => router.push('/(auth)/signup')}
            style={({ pressed }) => ({
              backgroundColor: accent,
              paddingVertical: Spacing.md,
              borderRadius: Radius.button,
              alignItems: 'center',
              opacity: pressed ? 0.9 : 1,
              marginBottom: Spacing.sm,
            })}
          >
            <Text style={{ ...Type.bodyLg, color: '#FFFFFF', fontFamily: 'Geist_600SemiBold' }}>
              Create account
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => ({
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: colors.surface.tertiary,
              paddingVertical: Spacing.md,
              borderRadius: Radius.button,
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                ...Type.bodyLg,
                color: colors.text.primary,
                fontFamily: 'Geist_600SemiBold',
              }}
            >
              Sign in
            </Text>
          </Pressable>

          <Text
            style={{
              ...Type.bodySm,
              color: colors.text.tertiary,
              textAlign: 'center',
              marginTop: Spacing.lg,
              paddingHorizontal: Spacing.md,
            }}
          >
            By continuing, you agree to our Terms and Privacy Policy.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
