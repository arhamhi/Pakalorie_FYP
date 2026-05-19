import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import type { AuthSessionResult } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { normalizeAuthError } from '../lib/authErrors';
import type { AuthError } from '../types/auth';

WebBrowser.maybeCompleteAuthSession();

type OnIdToken = (idToken: string) => Promise<void>;

function readExtraString(key: string): string {
  const value = Constants.expoConfig?.extra?.[key];
  return typeof value === 'string' ? value : '';
}

function getGoogleClientIds() {
  const webClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || readExtraString('googleSignInWebClientId');
  const iosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || readExtraString('googleSignInIosClientId');
  const androidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    readExtraString('googleSignInAndroidClientId') ||
    webClientId;

  const selectedClientId =
    Platform.select({
      ios: iosClientId,
      android: androidClientId,
      default: webClientId,
    }) || webClientId;

  return {
    webClientId,
    iosClientId,
    androidClientId,
    selectedClientId,
  };
}

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

function authSessionError(code: AuthError['code'], message: string): AuthError {
  return { code, message };
}

export function useGoogleAuthSession(onIdToken: OnIdToken) {
  const clientIds = useMemo(getGoogleClientIds, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const handledResultRef = useRef<AuthSessionResult | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: clientIds.selectedClientId || 'missing-google-client-id',
    webClientId: clientIds.webClientId || undefined,
    iosClientId: clientIds.iosClientId || undefined,
    androidClientId: clientIds.androidClientId || undefined,
    selectAccount: true,
  });

  const finishWithResult = useCallback(
    async (result: AuthSessionResult) => {
      if (result.type !== 'success') {
        setLoading(false);
        if (result.type === 'cancel' || result.type === 'dismiss') {
          setError(authSessionError('google-sign-in-cancelled', 'Sign-in cancelled.'));
          return;
        }
        setError(authSessionError('unknown', 'Google sign-in did not complete.'));
        return;
      }

      const idToken = result.params.id_token;
      if (!idToken) {
        // Native AuthSession initially returns a code, then the hook response
        // receives the exchanged id_token. Wait for that follow-up response.
        return;
      }

      try {
        await onIdToken(idToken);
        setError(null);
      } catch (err) {
        setError(normalizeAuthError(err));
      } finally {
        setLoading(false);
      }
    },
    [onIdToken]
  );

  useEffect(() => {
    if (!response || handledResultRef.current === response) return;
    handledResultRef.current = response;
    void finishWithResult(response);
  }, [finishWithResult, response]);

  const start = useCallback(async () => {
    setError(null);

    if (isExpoGo()) {
      setError(
        authSessionError(
          'google-auth-requires-dev-build',
          'Google sign-in needs a development or production build. Use email/password in Expo Go.'
        )
      );
      return;
    }

    if (!clientIds.selectedClientId) {
      setError(authSessionError('missing-google-client-id', 'Google client ID is missing from app.json.'));
      return;
    }

    if (!request) {
      setError(authSessionError('google-sign-in-in-progress', 'Google sign-in is still loading.'));
      return;
    }

    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type !== 'success' || result.params.id_token) {
        handledResultRef.current = result;
        await finishWithResult(result);
      }
    } catch (err) {
      setError(normalizeAuthError(err));
      setLoading(false);
    }
  }, [clientIds.selectedClientId, finishWithResult, promptAsync, request]);

  return {
    start,
    loading,
    error,
    expoGo: isExpoGo(),
  };
}
