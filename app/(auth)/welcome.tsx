import React from 'react';
import { View, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Type } from '../../src/constants/fonts';
import { Spacing, Radius } from '../../src/constants/spacing';
import { Colors } from '../../src/constants/colors';
import { PillButton } from '../../src/components/ui';

/**
 * Welcome — first-launch entry surface (auth route group).
 *
 * Stitch design: sage page background, Instrument Serif brand title,
 * ink primary pill + hairline secondary pill. Light mode only.
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
                ...Type.displaySerifLg,
                color: Colors.onAccent,
              }}
            >
              P
            </Text>
          </View>

          <Text
            style={{
              ...Type.displaySerifLg,
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
          <PillButton
            label="Create account"
            onPress={() => router.push('/(auth)/signup')}
            style={{ marginBottom: Spacing.sm }}
          />

          <PillButton
            label="Sign in"
            variant="secondary"
            onPress={() => router.push('/(auth)/login')}
          />

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
