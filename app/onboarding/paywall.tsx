import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useOnboarding } from '../../src/contexts/OnboardingContext';
import { Button } from '../../src/components/ui';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';

const PRIVACY_POLICY_URL = 'https://pakalorie.com/privacy';
const TERMS_OF_SERVICE_URL = 'https://pakalorie.com/terms';

const PRICING_TIERS = [
  { id: 'monthly', label: 'Monthly', duration: '1 month', price: 499, perMonth: 499, save: null, popular: false },
  { id: 'biannual', label: '6 Months', duration: '6 months', price: 2499, perMonth: 417, save: '16%', popular: true },
  { id: 'annual', label: 'Annual', duration: '12 months', price: 3999, perMonth: 333, save: '33%', popular: false },
];

const FREE_FEATURES = [
  { feature: 'Daily calorie target', free: true, premium: true },
  { feature: 'AI photo scanning', free: '5/day', premium: 'Unlimited' },
  { feature: 'Ustad chatbot', free: '5 chats/day', premium: 'Unlimited' },
  { feature: 'Food database search', free: true, premium: true },
  { feature: 'Manual logging', free: true, premium: true },
  { feature: 'Basic analytics', free: true, premium: true },
  { feature: 'Offline scanning', free: false, premium: '200 foods' },
  { feature: 'CSV data export', free: false, premium: true },
  { feature: 'Nearby restaurants', free: false, premium: true },
  { feature: 'Health sync', free: false, premium: true },
  { feature: 'Advanced analytics', free: false, premium: true },
  { feature: 'Ad-free', free: false, premium: true },
];

export default function PaywallScreen() {
  const { colors, accent } = useTheme();
  const { updateData } = useOnboarding();
  const [selectedTier, setSelectedTier] = useState('biannual');

  const handlePremium = () => {
    updateData({ isPremium: true });
    router.push('/onboarding/auth');
  };

  const handleFree = () => {
    updateData({ isPremium: false });
    router.push('/onboarding/auth');
  };

  const handleRestorePurchase = async () => {
    // TODO: Implement actual restore purchase logic with RevenueCat/StoreKit
    Alert.alert(
      'Restore Purchase',
      'Checking for previous purchases...',
      [{ text: 'OK' }]
    );
  };

  const openPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch (error) {
      console.error('Failed to open privacy policy:', error, PRIVACY_POLICY_URL);
      Alert.alert('Error', 'Could not open the privacy policy. Please try again later.');
    }
  };

  const openTermsOfService = async () => {
    try {
      await Linking.openURL(TERMS_OF_SERVICE_URL);
    } catch (error) {
      console.error('Failed to open terms of service:', error, TERMS_OF_SERVICE_URL);
      Alert.alert('Error', 'Could not open the terms of service. Please try again later.');
    }
  };

  return (
    <OnboardingBackground variant="accent">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 60,
          paddingBottom: 40,
        }}
      >
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginBottom: 24 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Header */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_700Bold',
            fontSize: 24,
            color: colors.text.primary,
            marginBottom: 8,
          }}
        >
          Aap ka nutrition journey kahin aur tak le jayein
        </Text>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 16,
            color: colors.text.secondary,
            marginBottom: 24,
          }}
        >
          Premium features unlock karein
        </Text>

        {/* Pricing Tiers - Card Hierarchy */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24, alignItems: 'flex-end', marginTop: 16 }}>
          {PRICING_TIERS.map((tier, index) => {
            const isSelected = selectedTier === tier.id;
            const isPopular = tier.popular;

            return (
              <TouchableOpacity
                key={tier.id}
                onPress={() => setSelectedTier(tier.id)}
                style={{
                  flex: 1,
                  minHeight: isPopular ? 200 : 160,
                  backgroundColor: isPopular
                    ? accent
                    : isSelected
                      ? accent + '20'
                      : colors.surface.secondary,
                  borderRadius: 16,
                  paddingVertical: isPopular ? 20 : 16,
                  paddingHorizontal: 12,
                  borderWidth: 2,
                  borderColor: isSelected && !isPopular ? accent : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: isPopular ? accent : '#000',
                  shadowOffset: { width: 0, height: isPopular ? 8 : 2 },
                  shadowOpacity: isPopular ? 0.4 : 0.1,
                  shadowRadius: isPopular ? 16 : 4,
                  elevation: isPopular ? 10 : 3,
                  transform: isPopular ? [{ scale: 1.05 }] : [],
                }}
              >
                {/* Most Popular Badge */}
                {isPopular && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -14,
                      backgroundColor: '#FFC107',
                      paddingHorizontal: 14,
                      paddingVertical: 5,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_700Bold',
                        fontSize: 11,
                        color: '#000',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Most Popular
                    </Text>
                  </View>
                )}

                {/* Save Badge for non-popular */}
                {tier.save && !isPopular && (
                  <View
                    style={{
                      backgroundColor: accent,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_600SemiBold',
                        fontSize: 9,
                        color: '#fff',
                      }}
                    >
                      Save {tier.save}
                    </Text>
                  </View>
                )}

                {/* Duration Label */}
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: isPopular ? 15 : 12,
                    color: isPopular ? '#fff' : colors.text.secondary,
                    marginBottom: 6,
                    marginTop: isPopular ? 10 : 0,
                  }}
                >
                  {tier.label}
                </Text>

                {/* Price */}
                <Text
                  style={{
                    fontFamily: 'IBMPlexMono_700Bold',
                    fontSize: isPopular ? 24 : 18,
                    color: isPopular ? '#fff' : colors.text.primary,
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Rs.{tier.perMonth}
                </Text>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_500Medium',
                    fontSize: 11,
                    color: isPopular ? 'rgba(255,255,255,0.8)' : colors.text.tertiary,
                  }}
                >
                  /month
                </Text>

                {/* Total Price */}
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_400Regular',
                    fontSize: 10,
                    color: isPopular ? 'rgba(255,255,255,0.6)' : colors.text.tertiary,
                    marginTop: 4,
                  }}
                  numberOfLines={1}
                >
                  Rs.{tier.price} total
                </Text>

                {/* Save badge for popular */}
                {isPopular && tier.save && (
                  <View
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      marginTop: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_600SemiBold',
                        fontSize: 11,
                        color: '#fff',
                      }}
                    >
                      Save {tier.save}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feature Comparison */}
        <View
          style={{
            backgroundColor: colors.surface.secondary,
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              marginBottom: 12,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.surface.tertiary,
            }}
          >
            <Text
              style={{
                flex: 2,
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 14,
                color: colors.text.primary,
              }}
            >
              Feature
            </Text>
            <Text
              style={{
                flex: 1,
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 14,
                color: colors.text.secondary,
                textAlign: 'center',
              }}
            >
              Free
            </Text>
            <Text
              style={{
                flex: 1,
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 14,
                color: accent,
                textAlign: 'center',
              }}
            >
              Premium
            </Text>
          </View>
          {FREE_FEATURES.map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                paddingVertical: 8,
              }}
            >
              <Text
                style={{
                  flex: 2,
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: 13,
                  color: colors.text.primary,
                }}
              >
                {item.feature}
              </Text>
              <View style={{ flex: 1, alignItems: 'center' }}>
                {item.free === true ? (
                  <MaterialIcons name="check" size={18} color={accent} />
                ) : item.free === false ? (
                  <MaterialIcons name="close" size={18} color={colors.text.tertiary} />
                ) : (
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_400Regular',
                      fontSize: 12,
                      color: colors.text.secondary,
                    }}
                  >
                    {item.free}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                {item.premium === true ? (
                  <MaterialIcons name="check" size={18} color={accent} />
                ) : (
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_400Regular',
                      fontSize: 12,
                      color: accent,
                    }}
                  >
                    {item.premium}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* CTA Buttons */}
        <Button
          title="Try Premium - 7 Days Free"
          onPress={handlePremium}
          size="lg"
          fullWidth
          icon={<MaterialIcons name="star" size={20} color="#fff" style={{ marginRight: 8 }} />}
        />
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 12,
            color: colors.text.tertiary,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          7 days free (no card required) • Cancel anytime
        </Text>

        <TouchableOpacity onPress={handleFree} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_500Medium',
              fontSize: 14,
              color: colors.text.secondary,
            }}
          >
            Continue with Free
          </Text>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 12,
              color: colors.text.tertiary,
              marginTop: 4,
            }}
          >
            5 scans/day, 5 Ustad chats/day
          </Text>
        </TouchableOpacity>

        {/* Restore Purchase Button */}
        <TouchableOpacity onPress={handleRestorePurchase} style={{ marginTop: 20, alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_500Medium',
              fontSize: 14,
              color: accent,
            }}
          >
            Restore Purchase
          </Text>
        </TouchableOpacity>

        {/* Legal Links */}
        <View style={{ marginTop: 24, alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 11,
              color: colors.text.tertiary,
              textAlign: 'center',
              lineHeight: 18,
            }}
          >
            By continuing, you agree to our{' '}
            <Text
              onPress={openTermsOfService}
              style={{ color: accent, textDecorationLine: 'underline' }}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              onPress={openPrivacyPolicy}
              style={{ color: accent, textDecorationLine: 'underline' }}
            >
              Privacy Policy
            </Text>
          </Text>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 10,
              color: colors.text.tertiary,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            Subscription auto-renews unless cancelled 24h before period ends
          </Text>
        </View>
      </ScrollView>
    </OnboardingBackground>
  );
}
