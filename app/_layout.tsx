import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { OnboardingProvider } from '../src/contexts/OnboardingContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
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

const ONBOARDING_KEY = '@pakalorie_onboarding_complete';

function RootLayoutNav() {
  const { theme, colors } = useTheme();
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const notificationListener = useRef<(() => void) | null>(null);

  // Reactive auth guard. The routing decision in app/index.tsx only runs while
  // mounted at '/', so a user who signs in while sitting on an (auth) screen
  // (login/signup/Google) never gets redirected — the button looked dead.
  // When auth flips and we're still in the (auth) group, bounce to '/' and let
  // index decide tabs vs onboarding. ponytail: single guard covers all entry
  // points instead of router.replace in each screen.
  useEffect(() => {
    if (loading) return;
    if (user && segments[0] === '(auth)') {
      router.replace('/');
    }
    // Mirror guard: a signed-out user deep-linked (or left stranded by a
    // sign-out) inside the app shell gets bounced to '/' → welcome. Only
    // index.tsx checked this before, so direct (tabs)/onboarding entries
    // rendered without a session.
    if (!user && (segments[0] === '(tabs)' || segments[0] === 'onboarding')) {
      router.replace('/');
    }
  }, [user, loading, segments, router]);

  // Notification setup runs only once the user is signed in AND onboarded —
  // otherwise the OS permission dialog pops over the welcome/onboarding
  // screens. The onboarding permissions step owns the first ask.
  useEffect(() => {
    if (!user) return;

    let active = true;
    const initNotifications = async () => {
      const onboarded =
        profile?.onboarding_complete ||
        (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true';
      if (!active || !onboarded) return;

      const granted = await requestNotificationPermissions();
      if (!active) return;

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
    return () => {
      active = false;
    };
  }, [user, profile?.onboarding_complete]);

  // The tap handler is registered unconditionally so a notification tap can
  // always route into the app.
  useEffect(() => {
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
