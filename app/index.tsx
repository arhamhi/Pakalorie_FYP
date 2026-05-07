import React, { useEffect } from 'react';
import { View, Text, ImageBackground, Dimensions, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { Button } from '../src/components/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@pakalorie_onboarding_complete';

export default function SplashScreen() {
  const { user, loading } = useAuth();
  const { colors, accent } = useTheme();
  const { height } = Dimensions.get('window');

  // Top 30% is occupied by the graphic
  const safePaddingTop = height * 0.3;

  useEffect(() => {
    const checkOnboarding = async () => {
      if (loading) return;

      // Check if onboarding was completed
      const onboardingComplete = await AsyncStorage.getItem(ONBOARDING_KEY);

      if (user && onboardingComplete) {
        // User logged in and completed onboarding - go to main app
        router.replace('/(tabs)');
      } else if (onboardingComplete && user) {
        // Onboarding done but not logged in - could be guest mode
        router.replace('/(tabs)');
      }
      // Otherwise stay on splash to start onboarding
    };

    checkOnboarding();
  }, [user, loading]);

  const handleStart = () => {
    router.push('/onboarding/goal');
  };

  return (
    <ImageBackground
      source={require('../assets/images/splash-bg.png')}
      style={{
        flex: 1,
        backgroundColor: '#000', // Fallback
      }}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <View
        style={{
          flex: 1,
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          paddingBottom: 60,
          paddingTop: safePaddingTop + 20, // Add a bit more spacing
        }}
      >
        {/* Top Section - Logo */}
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              backgroundColor: accent,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Text style={{ fontSize: 32, color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' }}>
              P
            </Text>
          </View>
        </View>

        {/* Center Section - Text */}
        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: 32,
              color: '#FFFFFF', // Force white for visibility on black bg
              textAlign: 'center',
              marginBottom: 12,
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 4,
            }}
          >
            Smarter{' '}
            <Text style={{ color: accent }}>Nutrition</Text>
            {'\n'}Starts Here.
          </Text>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 16,
              color: '#E0E0E0', // Light grey for secondary text
              textAlign: 'center',
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            Welcome
          </Text>
        </View>

        {/* Bottom Section - Button */}
        <View>
          <Button
            title="Chalo shuru karein"
            onPress={handleStart}
            size="lg"
            fullWidth
          />
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 12,
              color: '#AAAAAA', // Dimmed text for footer
              textAlign: 'center',
              marginTop: 16,
            }}
          >
            By continuing, you agree to our Terms and Privacy Policy
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}
