import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useOnboarding } from '../../src/contexts/OnboardingContext';
import { GOALS } from '../../src/constants/nutrition';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';

export default function GoalScreen() {
  const { colors, accent } = useTheme();
  const { data, updateData } = useOnboarding();

  const handleSelectGoal = (goalValue: string) => {
    updateData({ goalType: goalValue as any });
    router.push('/onboarding/age');
  };

  return (
    <OnboardingBackground>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 80,
          paddingBottom: 40,
        }}
      >
        {/* Header */}
        <View style={{ marginBottom: 40 }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: 28,
              color: colors.text.primary,
              marginBottom: 8,
            }}
          >
            Aap ki goal kya hai?
          </Text>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 16,
              color: colors.text.secondary,
            }}
          >
            Everything personalizes based on this.
          </Text>
        </View>

        {/* Goal Options */}
        <View style={{ gap: 16 }}>
          {GOALS.map((goal) => (
            <TouchableOpacity
              key={goal.value}
              onPress={() => handleSelectGoal(goal.value)}
              style={{
                backgroundColor:
                  data.goalType === goal.value
                    ? accent + '20'
                    : colors.surface.secondary,
                borderRadius: 16,
                padding: 20,
                borderWidth: 2,
                borderColor:
                  data.goalType === goal.value ? accent : 'transparent',
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: accent + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  <MaterialIcons
                    name={goal.icon as any}
                    size={24}
                    color={accent}
                  />
                </View>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: 18,
                    color: colors.text.primary,
                  }}
                >
                  {goal.label}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: 14,
                  color: colors.text.secondary,
                  lineHeight: 20,
                }}
              >
                {goal.description}
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
          Change kar sakte hain baad mein
        </Text>
      </ScrollView>
    </OnboardingBackground>
  );
}
