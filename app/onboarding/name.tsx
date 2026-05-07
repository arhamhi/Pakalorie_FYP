import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useOnboarding } from '../../src/contexts/OnboardingContext';
import { Button } from '../../src/components/ui';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';

export default function NameScreen() {
  const { colors, accent } = useTheme();
  const { data, updateData } = useOnboarding();
  const [name, setName] = useState(data.displayName || '');

  const handleContinue = () => {
    if (name.trim()) {
      updateData({ displayName: name.trim() });
    }
    router.push('/onboarding/ai-explanation');
  };

  const handleSkip = () => {
    router.push('/onboarding/ai-explanation');
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

      {/* Skip Button */}
      <TouchableOpacity
        onPress={handleSkip}
        style={{
          position: 'absolute',
          top: 60,
          right: 24,
          zIndex: 10,
          padding: 8,
        }}
      >
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
          Naam kya hai aap ka?
        </Text>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 16,
            color: colors.text.secondary,
            marginBottom: 40,
          }}
        >
          Taake properly greet kar sakein.
        </Text>

        {/* Name Input */}
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.text.tertiary}
          autoFocus
          style={{
            backgroundColor: colors.surface.secondary,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 18,
            fontFamily: 'PlusJakartaSans_500Medium',
            fontSize: 18,
            color: colors.text.primary,
            marginBottom: 16,
          }}
        />

        {/* Micro-copy */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 13,
            color: colors.text.tertiary,
            textAlign: 'center',
          }}
        >
          Sirf pehla naam chal jayega.
        </Text>
      </View>

      {/* Bottom Button */}
      <View style={{ paddingBottom: 40 }}>
        <Button title="Next" onPress={handleContinue} size="lg" fullWidth />
      </View>
      </View>
    </OnboardingBackground>
  );
}
