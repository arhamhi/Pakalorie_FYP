import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useOnboarding } from '../../src/contexts/OnboardingContext';
import { Button } from '../../src/components/ui';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';

export default function AgeScreen() {
  const { colors, accent } = useTheme();
  const { data, updateData } = useOnboarding();
  const [age, setAge] = useState(data.age || 25);

  const handleContinue = () => {
    updateData({ age });
    router.push('/onboarding/gender');
  };

  const incrementAge = () => {
    if (age < 100) setAge(age + 1);
  };

  const decrementAge = () => {
    if (age > 13) setAge(age - 1);
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {/* Header */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_700Bold',
            fontSize: 28,
            color: colors.text.primary,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Kitne saal ke hain aap?
        </Text>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 16,
            color: colors.text.secondary,
            textAlign: 'center',
            marginBottom: 60,
          }}
        >
          Metabolism calculate karne ke liye chahiye.
        </Text>

        {/* Age Picker */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 60,
          }}
        >
          <TouchableOpacity
            onPress={decrementAge}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.surface.secondary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialIcons name="remove" size={28} color={colors.text.primary} />
          </TouchableOpacity>

          <View style={{ marginHorizontal: 40, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'IBMPlexMono_700Bold',
                fontSize: 72,
                color: colors.text.primary,
              }}
            >
              {age}
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 16,
                color: colors.text.tertiary,
              }}
            >
              years
            </Text>
          </View>

          <TouchableOpacity
            onPress={incrementAge}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.surface.secondary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialIcons name="add" size={28} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Micro-copy */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 13,
            color: colors.text.tertiary,
            textAlign: 'center',
          }}
        >
          Sirf aap dekhenge, don't worry.
        </Text>
      </View>

      {/* Bottom Button */}
      <View style={{ paddingBottom: 40 }}>
        <Button title="Continue" onPress={handleContinue} size="lg" fullWidth />
      </View>
      </View>
    </OnboardingBackground>
  );
}
