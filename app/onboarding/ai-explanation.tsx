import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Button, FadeInView } from '../../src/components/ui';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';

const STEPS = [
  { icon: 'photo-camera', title: 'Photo lo', description: 'Apne khane ki' },
  { icon: 'smart-toy', title: 'AI pehchan legi', description: '500+ desi dishes' },
  { icon: 'edit', title: 'Aap verify karo', description: 'Agar zaroorat ho' },
];

const EXAMPLES = [
  { text: 'Biryani, pulao, karahi', status: 'success' },
  { text: 'Oil ki quantity', status: 'warning' },
  { text: 'Restaurant food', status: 'success' },
];

export default function AIExplanationScreen() {
  const { colors, accent } = useTheme();

  const handleContinue = () => {
    router.push('/onboarding/permissions');
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
        <FadeInView delay={100} duration={600}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: 28,
              color: colors.text.primary,
              marginBottom: 8,
            }}
          >
            Photo se tracking kaise hoti hai
          </Text>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 16,
              color: colors.text.secondary,
              marginBottom: 40,
            }}
          >
            AI hai, but magic nahi hai.
          </Text>
        </FadeInView>

        {/* Steps */}
        <View style={{ gap: 16, marginBottom: 32 }}>
          {STEPS.map((step, index) => (
            <FadeInView key={index} delay={300 + (index * 100)} direction="left">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surface.secondary,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: accent + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                  }}
                >
                  <MaterialIcons name={step.icon as any} size={24} color={accent} />
                </View>
                <View>
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_600SemiBold',
                      fontSize: 16,
                      color: colors.text.primary,
                    }}
                  >
                    {step.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_400Regular',
                      fontSize: 14,
                      color: colors.text.secondary,
                    }}
                  >
                    {step.description}
                  </Text>
                </View>
              </View>
            </FadeInView>
          ))}
        </View>

        {/* Accuracy */}
        <FadeInView delay={600} direction="up">
          <View
            style={{
              backgroundColor: colors.surface.secondary,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_500Medium',
                fontSize: 14,
                color: colors.text.primary,
                marginBottom: 12,
              }}
            >
              Accuracy: 75% Pakistani food pe. Baaki 25% mein aap thora adjust karoge.
            </Text>
            <View style={{ gap: 8 }}>
              {EXAMPLES.map((example, index) => (
                <View
                  key={index}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <MaterialIcons
                    name={example.status === 'success' ? 'check-circle' : 'error'}
                    size={18}
                    color={example.status === 'success' ? accent : '#FFC107'}
                  />
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_400Regular',
                      fontSize: 14,
                      color: colors.text.secondary,
                      marginLeft: 8,
                    }}
                  >
                    {example.text}
                    {example.status === 'warning' && ' — aap batana parega'}
                    {example.status === 'success' && ' — mostly accurate'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </FadeInView>

        {/* Micro-copy */}
        <FadeInView delay={700}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 13,
              color: colors.text.tertiary,
              textAlign: 'center',
            }}
          >
          Offline bhi kaam karega. WiFi baad mein sync ho jayega.
          </Text>
        </FadeInView>
      </View>

      {/* Bottom Button */}
      <View style={{ paddingBottom: 40 }}>
        <FadeInView delay={800} direction="up">
          <Button
            title="Samajh gaya, chalo start karte hain"
            onPress={handleContinue}
            size="lg"
            fullWidth
          />
        </FadeInView>
      </View>
      </View>
    </OnboardingBackground>
  );
}
