import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CheckIcon } from 'phosphor-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import {
  AuthHeader,
  AuthInput,
  PrimaryButton,
  FootLink,
} from '../../src/components/auth/AuthFormPrimitives';
import { Type, FontFamily } from '../../src/constants/fonts';
import { Spacing, Radius } from '../../src/constants/spacing';
import { Colors } from '../../src/constants/colors';
import type { AuthError } from '../../src/types/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const { colors, accent } = useTheme();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = (): boolean => {
    setEmailError(undefined);
    setFormError(undefined);
    if (!email.trim()) {
      setEmailError('Email is required.');
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Enter a valid email.');
      return false;
    }
    return true;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      const authErr = err as AuthError;
      setFormError(authErr.message ?? 'Could not send reset email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.surface.primary }}
      edges={['top', 'left', 'right']}
    >
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: Spacing.xl,
            paddingTop: Spacing.lg,
            paddingBottom: Spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {!sent ? (
            <>
              <AuthHeader
                title="Reset password"
                subtitle="We'll send you a link to set a new password."
              />

              <AuthInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                error={emailError}
                textContentType="emailAddress"
              />

              {formError && (
                <Text
                  style={{
                    ...Type.bodySm,
                    color: Colors.system.error,
                    marginTop: Spacing.xs,
                    marginBottom: Spacing.sm,
                    textAlign: 'center',
                  }}
                >
                  {formError}
                </Text>
              )}

              <View style={{ marginTop: Spacing.md }}>
                <PrimaryButton
                  label="Send reset link"
                  onPress={handleSend}
                  loading={loading}
                />
              </View>

              <FootLink
                prompt="Remembered it?"
                actionLabel="Back to sign in"
                onPress={() => router.replace('/(auth)/login')}
              />
            </>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: Radius.pill,
                  backgroundColor: accent + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: Spacing.xl,
                }}
              >
                <CheckIcon size={36} color={accent} weight="bold" />
              </View>

              <Text
                style={{
                  ...Type.headlineSerifMd,
                  color: colors.text.primary,
                  textAlign: 'center',
                  marginBottom: Spacing.sm,
                }}
              >
                Check your email
              </Text>
              <Text
                style={{
                  ...Type.bodyLg,
                  color: colors.text.secondary,
                  textAlign: 'center',
                  marginBottom: Spacing['2xl'],
                  paddingHorizontal: Spacing.lg,
                }}
              >
                We sent a reset link to{' '}
                <Text style={{ fontFamily: FontFamily.geistSemiBold }}>{email.trim()}</Text>.
              </Text>

              <View style={{ width: '100%', paddingHorizontal: Spacing.xl }}>
                <PrimaryButton
                  label="Back to sign in"
                  onPress={() => router.replace('/(auth)/login')}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
