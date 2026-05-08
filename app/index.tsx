import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';

const ONBOARDING_KEY = '@pakalorie_onboarding_complete';

/**
 * Root entry point.
 *
 * Pure routing decision based on Firebase auth state + local onboarding flag.
 * No visible UI beyond a brief loading spinner — the actual welcome surface
 * lives in `app/(auth)/welcome.tsx`.
 *
 *   loading                    → spinner
 *   no user                    → /(auth)/welcome
 *   user + onboarding complete → /(tabs)
 *   user + onboarding pending  → /onboarding/goal
 */
export default function Index() {
  const { user, loading } = useAuth();
  const { colors, accent } = useTheme();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => {
        if (active) setOnboardingComplete(value === 'true');
      })
      .catch(() => {
        if (active) setOnboardingComplete(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading || onboardingComplete === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.surface.primary,
        }}
      >
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!onboardingComplete) {
    return <Redirect href="/onboarding/goal" />;
  }

  return <Redirect href="/(tabs)" />;
}
