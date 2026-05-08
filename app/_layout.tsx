import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Constants from 'expo-constants';
import {
  useFonts,
  PlusJakartaSans_300Light,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
  IBMPlexMono_700Bold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { OnboardingProvider } from '../src/contexts/OnboardingContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { configureGoogleSignIn } from '../src/lib/firebase';
import {
  requestNotificationPermissions,
  rescheduleAllNotifications,
  setupNotificationResponseHandler,
  updateLastActiveDate,
  getDaysSinceLastActive,
  sendComebackNotification,
} from '../src/lib/notifications';
import '../src/styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

/**
 * Configure Google Sign-In once at app start. Reads the Web Client ID from
 * Expo `extra` config (set in app.json after Firebase Console setup). The
 * Web Client ID is what Firebase requires when exchanging the Google ID
 * token — NOT the Android or iOS client ID.
 */
function bootGoogleSignIn(): void {
  const webClientId =
    (Constants.expoConfig?.extra?.googleSignInWebClientId as string | undefined) ?? '';

  if (!webClientId) {
    // Surface loudly in dev; production builds should never hit this.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[auth] googleSignInWebClientId is empty in app.json → Google Sign-In will fail. ' +
          'Paste the Web Client ID from Firebase Console → Authentication → Sign-in method → Google.'
      );
    }
    return;
  }

  configureGoogleSignIn(webClientId);
}

function RootLayoutNav() {
  const { theme, colors } = useTheme();
  const router = useRouter();
  const notificationListener = useRef<(() => void) | null>(null);

  useEffect(() => {
    bootGoogleSignIn();

    // Initialize notifications
    const initNotifications = async () => {
      const granted = await requestNotificationPermissions();

      if (granted) {
        const daysAway = await getDaysSinceLastActive();
        if (daysAway >= 3) {
          await sendComebackNotification(daysAway);
        }
        await rescheduleAllNotifications();
      }

      await updateLastActiveDate();
    };

    initNotifications();

    notificationListener.current = setupNotificationResponseHandler(
      (notification) => {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('Notification received:', notification.request.content.title);
        }
      },
      (response) => {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('Notification tapped:', response.notification.request.content.title);
        }
        router.push('/(tabs)');
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current();
      }
    };
  }, [router]);

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.surface.primary,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="discover" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Pakalorie design system (Geist + Instrument Serif)
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    InstrumentSerif_400Regular,
    // v2 legacy fonts (still referenced by un-migrated screens; remove in
    // Phase 2 when polish pass lands across all surfaces)
    PlusJakartaSans_300Light,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    IBMPlexMono_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
        }}
      >
        <ActivityIndicator size="large" color="#1BAD66" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <OnboardingProvider>
                <RootLayoutNav />
              </OnboardingProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
