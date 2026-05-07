import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useOnboarding } from '../../src/contexts/OnboardingContext';
import { Button, FadeInView } from '../../src/components/ui';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

const THUMB_SIZE = 28;

// Conversion utilities
const cmToFtIn = (cm: number): { feet: number; inches: number } => {
  // Round totalInches first to avoid fractional edge cases
  const totalInches = Math.round(cm / 2.54);
  let feet = Math.floor(totalInches / 12);
  let inches = totalInches % 12;
  
  // Handle edge case where inches could round to 12
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  
  return { feet, inches };
};

const ftInToCm = (feet: number, inches: number): number => {
  return (feet * 12 + inches) * 2.54;
};

const kgToLbs = (kg: number): number => {
  return Math.round(kg * 2.20462);
};

const lbsToKg = (lbs: number): number => {
  return lbs / 2.20462;
};

// Unit Toggle Component
interface UnitToggleProps {
  options: [string, string];
  selected: 0 | 1;
  onSelect: (index: 0 | 1) => void;
  colors: any;
  accent: string;
}

const UnitToggle: React.FC<UnitToggleProps> = ({ options, selected, onSelect, colors, accent }) => {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface.secondary,
        borderRadius: 10,
        padding: 3,
      }}
    >
      {options.map((option, index) => (
        <TouchableOpacity
          key={option}
          onPress={() => onSelect(index as 0 | 1)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: selected === index ? accent : 'transparent',
          }}
        >
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontSize: 13,
              color: selected === index ? '#FFFFFF' : colors.text.tertiary,
            }}
          >
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Slider Component
interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  colors: any;
  accent: string;
  sliderWidth: number;
}

const Slider: React.FC<SliderProps> = ({ value, min, max, step, onValueChange, colors, accent, sliderWidth }) => {
  const translateX = useSharedValue(((value - min) / (max - min)) * (sliderWidth - THUMB_SIZE));
  const contextX = useSharedValue(0);
  const isActive = useSharedValue(false);

  const updateValue = useCallback(
    (x: number) => {
      const clampedX = Math.max(0, Math.min(x, sliderWidth - THUMB_SIZE));
      const percentage = clampedX / (sliderWidth - THUMB_SIZE);
      let newValue = min + percentage * (max - min);
      // Round to nearest step
      newValue = Math.round(newValue / step) * step;
      newValue = Math.max(min, Math.min(max, newValue));
      onValueChange(newValue);
    },
    [min, max, step, onValueChange, sliderWidth]
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
      isActive.value = true;
    })
    .onUpdate((event) => {
      const newX = contextX.value + event.translationX;
      const clampedX = Math.max(0, Math.min(newX, sliderWidth - THUMB_SIZE));
      translateX.value = clampedX;
      runOnJS(updateValue)(clampedX);
    })
    .onEnd(() => {
      isActive.value = false;
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: withSpring(isActive.value ? 1.15 : 1) },
    ],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE / 2,
  }));

  // Update slider position when value changes externally
  React.useEffect(() => {
    translateX.value = withSpring(((value - min) / (max - min)) * (sliderWidth - THUMB_SIZE), {
      damping: 20,
      stiffness: 200,
    });
  }, [value, min, max, sliderWidth]);

  return (
    <View style={{ width: sliderWidth, height: 40, justifyContent: 'center' }}>
      {/* Track Background */}
      <View
        style={{
          position: 'absolute',
          width: sliderWidth,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.surface.tertiary,
        }}
      />
      {/* Track Fill */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            height: 6,
            borderRadius: 3,
            backgroundColor: accent,
          },
          fillStyle,
        ]}
      />
      {/* Thumb */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            {
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              backgroundColor: accent,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
              borderWidth: 3,
              borderColor: '#FFFFFF',
            },
            thumbStyle,
          ]}
        />
      </GestureDetector>
    </View>
  );
};

export default function MeasurementsScreen() {
  const { colors, accent } = useTheme();
  const { data, updateData } = useOnboarding();
  const { width: screenWidth } = useWindowDimensions();
  const sliderWidth = screenWidth - 96; // Account for padding

  // Height state
  const [heightCm, setHeightCm] = useState(data.heightCm || 170);
  const [heightUnit, setHeightUnit] = useState<0 | 1>(0); // 0 = cm, 1 = ft/in

  // Weight state
  const [weightKg, setWeightKg] = useState(data.weightKg || 70);
  const [weightUnit, setWeightUnit] = useState<0 | 1>(0); // 0 = kg, 1 = lbs

  // Height range (100cm - 230cm / 3'3" - 7'7")
  const HEIGHT_MIN_CM = 100;
  const HEIGHT_MAX_CM = 230;

  // Weight range (30kg - 200kg / 66lbs - 440lbs)
  const WEIGHT_MIN_KG = 30;
  const WEIGHT_MAX_KG = 200;

  const handleContinue = () => {
    updateData({ heightCm, weightKg });
    router.push('/onboarding/activity');
  };

  // Format height display
  const formatHeight = (): string => {
    if (heightUnit === 0) {
      return `${Math.round(heightCm)}`;
    } else {
      const { feet, inches } = cmToFtIn(heightCm);
      return `${feet}'${inches}"`;
    }
  };

  // Format weight display
  const formatWeight = (): string => {
    if (weightUnit === 0) {
      return `${Math.round(weightKg)}`;
    } else {
      return `${kgToLbs(weightKg)}`;
    }
  };

  const isValid = heightCm > 0 && weightKg > 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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

          <FadeInView delay={100} duration={600}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_700Bold',
                fontSize: 28,
                color: colors.text.primary,
                marginBottom: 8,
              }}
            >
              Height aur Weight
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 16,
                color: colors.text.secondary,
                marginBottom: 48,
              }}
            >
              Bas current numbers—tension nahi lena.
            </Text>
          </FadeInView>

          <FadeInView delay={300} direction="left">
            <View style={{ marginBottom: 40 }}>
              {/* Height Header with Unit Toggle */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: 16,
                    color: colors.text.secondary,
                  }}
                >
                  Height
                </Text>
                <UnitToggle
                  options={['cm', 'ft/in']}
                  selected={heightUnit}
                  onSelect={setHeightUnit}
                  colors={colors}
                  accent={accent}
                />
              </View>

              {/* Height Value Display */}
              <View
                style={{
                  backgroundColor: colors.surface.secondary,
                  borderRadius: 16,
                  padding: 20,
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text
                    style={{
                      fontFamily: 'IBMPlexMono_700Bold',
                      fontSize: 48,
                      color: colors.text.primary,
                    }}
                  >
                    {formatHeight()}
                  </Text>
                  {heightUnit === 0 && (
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_500Medium',
                        fontSize: 20,
                        color: colors.text.tertiary,
                        marginLeft: 8,
                      }}
                    >
                      cm
                    </Text>
                  )}
                </View>
              </View>

              {/* Height Slider */}
              <View style={{ alignItems: 'center' }}>
                <Slider
                  value={heightCm}
                  min={HEIGHT_MIN_CM}
                  max={HEIGHT_MAX_CM}
                  step={1}
                  onValueChange={setHeightCm}
                  colors={colors}
                  accent={accent}
                  sliderWidth={sliderWidth}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    width: sliderWidth,
                    marginTop: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_400Regular',
                      fontSize: 12,
                      color: colors.text.tertiary,
                    }}
                  >
                    {heightUnit === 0 ? '100 cm' : "3'3\""}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_400Regular',
                      fontSize: 12,
                      color: colors.text.tertiary,
                    }}
                  >
                    {heightUnit === 0 ? '230 cm' : "7'7\""}
                  </Text>
                </View>
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={500} direction="right">
            <View style={{ marginBottom: 24 }}>
              {/* Weight Header with Unit Toggle */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: 16,
                    color: colors.text.secondary,
                  }}
                >
                  Weight
                </Text>
                <UnitToggle
                  options={['kg', 'lbs']}
                  selected={weightUnit}
                  onSelect={setWeightUnit}
                  colors={colors}
                  accent={accent}
                />
              </View>

              {/* Weight Value Display */}
              <View
                style={{
                  backgroundColor: colors.surface.secondary,
                  borderRadius: 16,
                  padding: 20,
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text
                    style={{
                      fontFamily: 'IBMPlexMono_700Bold',
                      fontSize: 48,
                      color: colors.text.primary,
                    }}
                  >
                    {formatWeight()}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_500Medium',
                      fontSize: 20,
                      color: colors.text.tertiary,
                      marginLeft: 8,
                    }}
                  >
                    {weightUnit === 0 ? 'kg' : 'lbs'}
                  </Text>
                </View>
              </View>

              {/* Weight Slider */}
              <View style={{ alignItems: 'center' }}>
                <Slider
                  value={weightKg}
                  min={WEIGHT_MIN_KG}
                  max={WEIGHT_MAX_KG}
                  step={0.5}
                  onValueChange={setWeightKg}
                  colors={colors}
                  accent={accent}
                  sliderWidth={sliderWidth}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    width: sliderWidth,
                    marginTop: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_400Regular',
                      fontSize: 12,
                      color: colors.text.tertiary,
                    }}
                  >
                    {weightUnit === 0 ? '30 kg' : '66 lbs'}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_400Regular',
                      fontSize: 12,
                      color: colors.text.tertiary,
                    }}
                  >
                    {weightUnit === 0 ? '200 kg' : '440 lbs'}
                  </Text>
                </View>
              </View>
            </View>
          </FadeInView>

          {/* Micro-copy */}
          <FadeInView delay={600}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 13,
                color: colors.text.tertiary,
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              Estimate bhi chal jayega, adjust karte rahenge.
            </Text>
          </FadeInView>
        </View>

        {/* Bottom Button */}
        <View style={{ paddingBottom: 40 }}>
          <FadeInView delay={700} direction="up">
            <Button
              title="Continue"
              onPress={handleContinue}
              size="lg"
              fullWidth
              disabled={!isValid}
            />
          </FadeInView>
        </View>
        </View>
      </OnboardingBackground>
    </GestureHandlerRootView>
  );
}
