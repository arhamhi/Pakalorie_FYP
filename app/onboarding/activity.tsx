import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useOnboarding } from '../../src/contexts/OnboardingContext';
import { ACTIVITY_LEVELS } from '../../src/constants/nutrition';
import { Button } from '../../src/components/ui';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';

export default function ActivityScreen() {
  const { colors, accent } = useTheme();
  const { data, updateData } = useOnboarding();
  const [selectedIndex, setSelectedIndex] = useState(
    data.activityLevel
      ? ACTIVITY_LEVELS.findIndex((a) => a.value === data.activityLevel)
      : 2
  );

  const handleContinue = () => {
    const selected = ACTIVITY_LEVELS[selectedIndex];
    updateData({ activityLevel: selected.value });
    router.push('/onboarding/target');
  };

  const selectedLevel = ACTIVITY_LEVELS[selectedIndex];

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
          Kitna active rehte hain?
        </Text>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 16,
            color: colors.text.secondary,
            marginBottom: 40,
          }}
        >
          Daily calorie target pe asar parega.
        </Text>

        {/* Activity Levels */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          {ACTIVITY_LEVELS.map((level, index) => (
            <TouchableOpacity
              key={level.value}
              onPress={() => setSelectedIndex(index)}
              style={{
                backgroundColor:
                  selectedIndex === index
                    ? accent + '20'
                    : colors.surface.secondary,
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 2,
                borderColor:
                  selectedIndex === index ? accent : 'transparent',
              }}
              activeOpacity={0.8}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor:
                    selectedIndex === index ? accent : colors.surface.tertiary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <MaterialIcons
                  name={level.icon as any}
                  size={20}
                  color={selectedIndex === index ? '#fff' : colors.text.secondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: 16,
                    color: colors.text.primary,
                  }}
                >
                  {level.label}
                </Text>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_400Regular',
                    fontSize: 13,
                    color: colors.text.tertiary,
                  }}
                >
                  {level.description}
                </Text>
              </View>
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
          }}
        >
          Normal chalna phirna count nahi hota.
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
