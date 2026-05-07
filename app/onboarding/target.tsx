import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useOnboarding } from '../../src/contexts/OnboardingContext';
import { Button, ProgressRing } from '../../src/components/ui';
import { calculateDailyTarget, calculateMacros, GOALS } from '../../src/constants/nutrition';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';

export default function TargetScreen() {
  const { colors, accent } = useTheme();
  const { data, updateData } = useOnboarding();
  const [adjustment, setAdjustment] = useState(0);

  // Calculate TDEE and target
  const maintenanceCalories =
    data.weightKg && data.heightCm && data.age && data.gender && data.activityLevel
      ? calculateDailyTarget(
          data.weightKg,
          data.heightCm,
          data.age,
          data.gender,
          data.activityLevel,
          'maintain'
        )
      : 2000;

  const goalModifier = GOALS.find((g) => g.value === data.goalType)?.calorieModifier || 0;
  const baseTarget = maintenanceCalories + goalModifier;
  const finalTarget = baseTarget + adjustment;

  const macros = data.goalType ? calculateMacros(finalTarget, data.goalType) : null;

  const handleContinue = () => {
    updateData({ dailyTargetKcal: finalTarget });
    router.push('/onboarding/paywall');
  };

  const getGoalDescription = () => {
    switch (data.goalType) {
      case 'lose':
        return '0.5kg lose per week';
      case 'gain':
        return '0.3kg gain per week';
      default:
        return 'maintain weight';
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
          Aap ka daily calorie target
        </Text>

        {/* Calorie Ring */}
        <View style={{ marginVertical: 40 }}>
          <ProgressRing
            progress={100}
            size={200}
            strokeWidth={14}
            value={finalTarget.toLocaleString()}
            unit="kcal"
          />
        </View>

        {/* Breakdown */}
        <View
          style={{
            backgroundColor: colors.surface.secondary,
            borderRadius: 16,
            padding: 20,
            width: '100%',
            marginBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 14,
                color: colors.text.secondary,
              }}
            >
              Maintenance
            </Text>
            <Text
              style={{
                fontFamily: 'IBMPlexMono_500Medium',
                fontSize: 14,
                color: colors.text.primary,
              }}
            >
              {maintenanceCalories.toLocaleString()} kcal
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 14,
                color: colors.text.secondary,
              }}
            >
              Goal adjustment
            </Text>
            <Text
              style={{
                fontFamily: 'IBMPlexMono_500Medium',
                fontSize: 14,
                color: goalModifier < 0 ? '#D32F2F' : accent,
              }}
            >
              {goalModifier > 0 ? '+' : ''}
              {goalModifier} kcal
            </Text>
          </View>
          <View
            style={{
              height: 1,
              backgroundColor: colors.surface.tertiary,
              marginVertical: 12,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 16,
                color: colors.text.primary,
              }}
            >
              Your target
            </Text>
            <Text
              style={{
                fontFamily: 'IBMPlexMono_700Bold',
                fontSize: 16,
                color: accent,
              }}
            >
              {finalTarget.toLocaleString()} kcal
            </Text>
          </View>
        </View>

        {/* Goal description */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 14,
            color: colors.text.secondary,
            textAlign: 'center',
          }}
        >
          Aap ke goal ke hisaab se ({getGoalDescription()})
        </Text>

        {/* Adjust Button */}
        <TouchableOpacity
          style={{
            marginTop: 16,
            paddingVertical: 8,
            paddingHorizontal: 16,
          }}
        >
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_500Medium',
              fontSize: 14,
              color: accent,
            }}
          >
            Adjust karna hai
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Buttons */}
      <View style={{ paddingBottom: 40 }}>
        <Button title="Theek hai" onPress={handleContinue} size="lg" fullWidth />
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 13,
            color: colors.text.tertiary,
            textAlign: 'center',
            marginTop: 12,
          }}
        >
          Settings mein kabhi bhi change kar sakte hain.
        </Text>
      </View>
      </View>
    </OnboardingBackground>
  );
}
