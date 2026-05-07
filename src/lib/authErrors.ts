import { googleSigninStatusCodes } from './firebase';
import type { AuthError, AuthErrorCode } from '../types/auth';

/**
 * Normalize Firebase Auth + Google Sign-In errors into our project-level
 * AuthError shape. UI layer reads `code` to pick a localized message and
 * falls back to `message` for unhandled cases.
 */
export function normalizeAuthError(error: unknown): AuthError {
  if (typeof error !== 'object' || error === null) {
    return { code: 'unknown', message: getErrorMessage(error) };
  }

  const err = error as { code?: string; message?: string };

  // Google Sign-In status codes (numeric in JS land) live on err.code
  if (err.code === googleSigninStatusCodes.SIGN_IN_CANCELLED) {
    return { code: 'google-sign-in-cancelled', message: 'Sign-in cancelled.' };
  }
  if (err.code === googleSigninStatusCodes.IN_PROGRESS) {
    return { code: 'google-sign-in-in-progress', message: 'Sign-in already in progress.' };
  }
  if (err.code === googleSigninStatusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return {
      code: 'google-play-services-unavailable',
      message: 'Google Play Services not available on this device.',
    };
  }

  // Firebase Auth error codes are strings like 'auth/invalid-email'
  switch (err.code) {
    case 'auth/invalid-email':
      return { code: 'invalid-email', message: 'Email address is not valid.' };
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return { code: 'invalid-credentials', message: 'Email or password is incorrect.' };
    case 'auth/email-already-in-use':
      return { code: 'email-already-in-use', message: 'An account already exists for that email.' };
    case 'auth/weak-password':
      return { code: 'weak-password', message: 'Password must be at least 8 characters.' };
    case 'auth/user-not-found':
      return { code: 'user-not-found', message: 'No account found for that email.' };
    case 'auth/network-request-failed':
      return { code: 'network-request-failed', message: 'Network error. Check your connection.' };
    case 'auth/too-many-requests':
      return { code: 'too-many-requests', message: 'Too many attempts. Try again in a few minutes.' };
    default:
      return { code: 'unknown', message: err.message ?? getErrorMessage(error) };
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unexpected error.';
}

export function isAuthErrorCode(error: unknown, code: AuthErrorCode): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === code
  );
}
