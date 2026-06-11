import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function OnboardingLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.surface.primary,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="goal" />
      <Stack.Screen name="age" />
      <Stack.Screen name="gender" />
      <Stack.Screen name="measurements" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="target" />
      <Stack.Screen name="paywall" />
      <Stack.Screen name="name" />
      <Stack.Screen name="ai-explanation" />
      <Stack.Screen name="permissions" />
    </Stack>
  );
}
