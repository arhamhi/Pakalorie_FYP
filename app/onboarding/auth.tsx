import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { Button } from '../../src/components/ui';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';

// Required for web browser redirect to complete
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs
const GOOGLE_IOS_CLIENT_ID = '349812205714-nn3famkpl6ljn9q0fsg16e2n6rn7ltae.apps.googleusercontent.com';
// TODO: Add your Web Client ID from Google Cloud Console
const GOOGLE_WEB_CLIENT_ID = '349812205714-ha4to1l5ub8td0icbfb5521u3bq6phro.apps.googleusercontent.com';
// TODO: Add your Android Client ID from Google Cloud Console (if needed)
// IMPORTANT: This is a placeholder - replace with real Android client ID before releasing on Android
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';

// Only include Android client ID if it's been configured (not a placeholder)
const isAndroidClientIdConfigured = !GOOGLE_ANDROID_CLIENT_ID.includes('YOUR_ANDROID_CLIENT_ID');

export default function AuthScreen() {
  const { colors, accent } = useTheme();
  const { signInWithGoogle, signInWithApple, signInWithPhone, verifyOtp } = useAuth();
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);

  // Google Auth Request hook - omit Android client ID if not configured
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    ...(isAndroidClientIdConfigured && { androidClientId: GOOGLE_ANDROID_CLIENT_ID }),
  });

  // Handle Google auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        handleGoogleSignIn(id_token);
      }
    } else if (response?.type === 'error') {
      Alert.alert('Error', response.error?.message || 'Google sign-in failed');
      setLoading(false);
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      await signInWithGoogle(idToken);
      router.push('/onboarding/name');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      await promptAsync();
      // The response will be handled in the useEffect above
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const handleApple = async () => {
    try {
      setLoading(true);
      await signInWithApple();
      router.push('/onboarding/name');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSend = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    try {
      setLoading(true);
      await signInWithPhone(`+92${phone}`);
      setShowOtpInput(true);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    try {
      setLoading(true);
      await verifyOtp(`+92${phone}`, otp);
      router.push('/onboarding/name');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/name');
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
          Ab account banate hain
        </Text>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 16,
            color: colors.text.secondary,
            marginBottom: 40,
          }}
        >
          Taake aap ka data safe rahe aur sab devices pe sync ho.
        </Text>

        {!showPhoneInput ? (
          <>
            {/* Social Login Buttons */}
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={handleGoogle}
                disabled={loading || !request}
                style={{
                  backgroundColor: '#4285F4',
                  borderRadius: 12,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: loading || !request ? 0.7 : 1,
                }}
              >
                <MaterialIcons name="mail" size={22} color="#fff" />
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: 16,
                    color: '#fff',
                    marginLeft: 12,
                  }}
                >
                  Continue with Google
                </Text>
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  onPress={handleApple}
                  disabled={loading}
                  style={{
                    backgroundColor: colors.text.primary,
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons
                    name="apple"
                    size={22}
                    color={colors.surface.primary}
                  />
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_600SemiBold',
                      fontSize: 16,
                      color: colors.surface.primary,
                      marginLeft: 12,
                    }}
                  >
                    Continue with Apple
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setShowPhoneInput(true)}
                style={{
                  backgroundColor: colors.surface.secondary,
                  borderRadius: 12,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="phone" size={22} color={colors.text.primary} />
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    fontSize: 16,
                    color: colors.text.primary,
                    marginLeft: 12,
                  }}
                >
                  Continue with Phone Number
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Phone Input */}
            {!showOtpInput ? (
              <View>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_500Medium',
                    fontSize: 14,
                    color: colors.text.secondary,
                    marginBottom: 8,
                  }}
                >
                  Phone Number
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.surface.secondary,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'PlusJakartaSans_500Medium',
                      fontSize: 16,
                      color: colors.text.primary,
                      marginRight: 8,
                    }}
                  >
                    +92
                  </Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="3XX XXXXXXX"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="phone-pad"
                    style={{
                      flex: 1,
                      fontFamily: 'IBMPlexMono_500Medium',
                      fontSize: 18,
                      color: colors.text.primary,
                      paddingVertical: 16,
                    }}
                  />
                </View>
                <Button
                  title="Send OTP"
                  onPress={handlePhoneSend}
                  size="lg"
                  fullWidth
                  loading={loading}
                />
              </View>
            ) : (
              <View>
                <Text
                  style={{
                    fontFamily: 'PlusJakartaSans_500Medium',
                    fontSize: 14,
                    color: colors.text.secondary,
                    marginBottom: 8,
                  }}
                >
                  Enter OTP
                </Text>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="______"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{
                    backgroundColor: colors.surface.secondary,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    fontFamily: 'IBMPlexMono_600SemiBold',
                    fontSize: 24,
                    color: colors.text.primary,
                    textAlign: 'center',
                    letterSpacing: 8,
                    marginBottom: 16,
                  }}
                />
                <Button
                  title="Verify"
                  onPress={handleOtpVerify}
                  size="lg"
                  fullWidth
                  loading={loading}
                />
              </View>
            )}
            <TouchableOpacity
              onPress={() => {
                setShowPhoneInput(false);
                setShowOtpInput(false);
              }}
              style={{ marginTop: 16, alignItems: 'center' }}
            >
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 14,
                  color: accent,
                }}
              >
                Back to login options
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Skip Option */}
        <TouchableOpacity onPress={handleSkip} style={{ marginTop: 32, alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_500Medium',
              fontSize: 14,
              color: colors.text.secondary,
            }}
          >
            Skip for now—save locally
          </Text>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 12,
              color: colors.text.tertiary,
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            Data sirf is device pe save hoga. Account baad mein bhi bana sakte hain.
          </Text>
        </TouchableOpacity>
      </View>
      </View>
    </OnboardingBackground>
  );
}
