import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useOnboarding } from '../../src/contexts/OnboardingContext';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';

const GENDERS = [
  { value: 'male', label: 'Male', icon: 'male' },
  { value: 'female', label: 'Female', icon: 'female' },
  { value: 'other', label: 'Prefer not to say', icon: 'person' },
] as const;

export default function GenderScreen() {
  const { colors, accent } = useTheme();
  const { data, updateData } = useOnboarding();

  const handleSelectGender = (gender: 'male' | 'female' | 'other') => {
    updateData({ gender });
    router.push('/onboarding/measurements');
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
          Gender?
        </Text>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 16,
            color: colors.text.secondary,
            marginBottom: 40,
          }}
        >
          Calorie calculation thora adjust hoga.
        </Text>

        {/* Gender Options */}
        <View style={{ gap: 12 }}>
          {GENDERS.map((gender) => (
            <TouchableOpacity
              key={gender.value}
              onPress={() => handleSelectGender(gender.value)}
              style={{
                backgroundColor:
                  data.gender === gender.value
                    ? accent + '20'
                    : colors.surface.secondary,
                borderRadius: 16,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 2,
                borderColor:
                  data.gender === gender.value ? accent : 'transparent',
              }}
              activeOpacity={0.8}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor:
                    data.gender === gender.value ? accent : colors.surface.tertiary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}
              >
                <MaterialIcons
                  name={gender.icon as any}
                  size={24}
                  color={data.gender === gender.value ? '#fff' : colors.text.secondary}
                />
              </View>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: 18,
                  color: colors.text.primary,
                }}
              >
                {gender.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Micro-copy */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 13,
            color: colors.text.tertiary,
            textAlign: 'center',
            marginTop: 24,
          }}
        >
          Profile pe show nahi hoga.
        </Text>
      </View>
      </View>
    </OnboardingBackground>
  );
}
