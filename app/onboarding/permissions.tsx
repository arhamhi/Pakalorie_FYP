import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useOnboarding } from '../../src/contexts/OnboardingContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { Button } from '../../src/components/ui';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';

const ONBOARDING_KEY = '@pakalorie_onboarding_complete';

type PermissionStep = 'camera' | 'location' | 'complete';

export default function PermissionsScreen() {
  const { colors, accent } = useTheme();
  const { data, updateData } = useOnboarding();
  const { user, updateProfile } = useAuth();
  const [step, setStep] = useState<PermissionStep>('camera');
  const [loading, setLoading] = useState(false);

  const handleCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') {
      if (data.isPremium) {
        setStep('location');
      } else {
        await completeOnboarding();
      }
    } else {
      Alert.alert(
        'Camera Permission',
        'Camera access is needed to scan your meals. You can enable it later in Settings.',
        [
          {
            text: 'Continue anyway',
            onPress: () => {
              if (data.isPremium) {
                setStep('location');
              } else {
                completeOnboarding();
              }
            },
          },
        ]
      );
    }
  };

  const handleLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted' || status === 'denied') {
      await completeOnboarding();
    }
  };

  const handleSkipLocation = async () => {
    await completeOnboarding();
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      // Save profile to Firestore if logged in. onboarding_complete is the
      // cloud source of truth so signing in on a new device skips onboarding;
      // the AsyncStorage flag below stays as a local fast-path cache.
      if (user) {
        await updateProfile({
          display_name: data.displayName,
          gender: data.gender,
          current_weight_kg: data.weightKg,
          height_cm: data.heightCm,
          goal_type: data.goalType,
          activity_level: data.activityLevel,
          daily_target_kcal: data.dailyTargetKcal,
          is_premium: data.isPremium,
          onboarding_complete: true,
        });
      }

      // Mark onboarding as complete
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingBackground>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
        }}
      >
      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: 60,
          left: 24,
          zIndex: 10,
          padding: 8,
        }}
      >
        <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      {/* Content */}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {/* Header */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_700Bold',
            fontSize: 28,
            color: colors.text.primary,
            marginBottom: 8,
          }}
        >
          Almost done
        </Text>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 16,
            color: colors.text.secondary,
            marginBottom: 40,
          }}
        >
          Bas ye permissions chahiye.
        </Text>

        {step === 'camera' && (
          <View
            style={{
              backgroundColor: colors.surface.secondary,
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                backgroundColor: accent + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <MaterialIcons name="photo-camera" size={40} color={accent} />
            </View>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 20,
                color: colors.text.primary,
                marginBottom: 8,
              }}
            >
              Camera Access
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 14,
                color: colors.text.secondary,
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              Khane ki photos ke liye camera access chahiye.
            </Text>
            <Button
              title="Allow karo"
              onPress={handleCameraPermission}
              size="lg"
              fullWidth
            />
          </View>
        )}

        {step === 'location' && (
          <View
            style={{
              backgroundColor: colors.surface.secondary,
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                backgroundColor: accent + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <MaterialIcons name="location-on" size={40} color={accent} />
            </View>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 20,
                color: colors.text.primary,
                marginBottom: 8,
              }}
            >
              Location Access
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 14,
                color: colors.text.secondary,
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              Paas ke healthy restaurants suggest karne ke liye location chahiye.
            </Text>
            <Button
              title="Allow karo"
              onPress={handleLocationPermission}
              size="lg"
              fullWidth
            />
            <TouchableOpacity onPress={handleSkipLocation} style={{ marginTop: 16 }}>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 14,
                  color: colors.text.secondary,
                }}
              >
                Skip
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      </View>
    </OnboardingBackground>
  );
}
