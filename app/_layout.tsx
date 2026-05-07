import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
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
import { AuthProvider } from '../src/contexts/AuthContext';
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

function RootLayoutNav() {
  const { theme, colors } = useTheme();
  const router = useRouter();
  const notificationListener = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Initialize notifications
    const initNotifications = async () => {
      // Request permissions
      const granted = await requestNotificationPermissions();
      
      if (granted) {
        // Check if user is returning after absence
        const daysAway = await getDaysSinceLastActive();
        if (daysAway >= 3) {
          await sendComebackNotification(daysAway);
        }

        // Schedule all recurring notifications
        await rescheduleAllNotifications();
      }

      // Update last active date
      await updateLastActiveDate();
    };

    initNotifications();

    // Set up notification response handler
    notificationListener.current = setupNotificationResponseHandler(
      // When notification received while app is open
      (notification) => {
        console.log('Notification received:', notification.request.content.title);
      },
      // When user taps on notification
      (response) => {
        console.log('Notification tapped:', response.notification.request.content.title);
        // Navigate to home screen when notification is tapped
        router.push('/(tabs)');
      }
    );

    return () => {
      // Cleanup notification listeners
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
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="discover" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
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

