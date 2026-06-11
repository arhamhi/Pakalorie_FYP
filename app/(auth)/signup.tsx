import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EyeIcon, EyeClosedIcon } from 'phosphor-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoogleAuthSession } from '../../src/hooks/useGoogleAuthSession';
import {
  AuthHeader,
  AuthInput,
  PrimaryButton,
  GoogleButton,
  Divider,
  FootLink,
} from '../../src/components/auth/AuthFormPrimitives';
import { Type } from '../../src/constants/fonts';
import { Spacing } from '../../src/constants/spacing';
import { Colors } from '../../src/constants/colors';
import type { AuthError } from '../../src/types/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;

export default function SignupScreen() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const { colors } = useTheme();
  const googleAuth = useGoogleAuthSession(signInWithGoogle);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    if (!googleAuth.error) return;
    if (googleAuth.error.code !== 'google-sign-in-cancelled') {
      setFormError(googleAuth.error.message ?? 'Google sign-in failed.');
    }
  }, [googleAuth.error]);

  const validate = (): boolean => {
    let ok = true;
    setEmailError(undefined);
    setPasswordError(undefined);
    setFormError(undefined);

    if (!email.trim()) {
      setEmailError('Email is required.');
      ok = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Enter a valid email.');
      ok = false;
    }

    if (!password) {
      setPasswordError('Password is required.');
      ok = false;
    } else if (password.length < MIN_PASSWORD_LEN) {
      setPasswordError(`At least ${MIN_PASSWORD_LEN} characters.`);
      ok = false;
    }

    return ok;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setEmailLoading(true);
    try {
      await signUpWithEmail(email.trim(), password);
      // AuthContext seeds the Firestore user doc with onboarding_complete:false.
      // Root index will redirect into /onboarding/goal once user state flips.
    } catch (err) {
      const authErr = err as AuthError;
      setFormError(authErr.message ?? 'Could not create account. Try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogle = async () => {
    setFormError(undefined);
    await googleAuth.start();
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
          <AuthHeader
            title="Create account"
            subtitle="Start tracking your meals in seconds."
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

          <AuthInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            autoCorrect={false}
            error={passwordError}
            hint={passwordError ? undefined : `At least ${MIN_PASSWORD_LEN} characters.`}
            textContentType="newPassword"
            rightSlot={
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                style={{ padding: 4 }}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeClosedIcon size={20} color={colors.text.tertiary} weight="regular" />
                ) : (
                  <EyeIcon size={20} color={colors.text.tertiary} weight="regular" />
                )}
              </Pressable>
            }
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
              label="Create account"
              onPress={handleSignUp}
              loading={emailLoading}
              disabled={googleAuth.loading}
            />
          </View>

          <Divider label="or" />

          <GoogleButton
            onPress={handleGoogle}
            loading={googleAuth.loading}
            disabled={emailLoading}
          />

          <FootLink
            prompt="Already have an account?"
            actionLabel="Sign in"
            onPress={() => router.replace('/(auth)/login')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
