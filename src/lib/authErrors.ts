import type { AuthError, AuthErrorCode } from '../types/auth';

/**
 * Normalize Firebase Auth + Google AuthSession errors into our project-level
 * AuthError shape. UI layer reads `code` to pick a localized message and
 * falls back to `message` for unhandled cases.
 */
export function normalizeAuthError(error: unknown): AuthError {
  if (typeof error !== 'object' || error === null) {
    return { code: 'unknown', message: getErrorMessage(error) };
  }

  const err = error as { code?: string; message?: string };

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
    case 'google-sign-in-cancelled':
      return { code: 'google-sign-in-cancelled', message: 'Sign-in cancelled.' };
    case 'google-sign-in-in-progress':
      return { code: 'google-sign-in-in-progress', message: 'Sign-in already in progress.' };
    case 'google-play-services-unavailable':
      return {
        code: 'google-play-services-unavailable',
        message: 'Google Play Services not available on this device.',
      };
    case 'google-auth-requires-dev-build':
      return {
        code: 'google-auth-requires-dev-build',
        message: 'Google sign-in needs a development or production build. Use email/password in Expo Go.',
      };
    case 'missing-google-client-id':
      return {
        code: 'missing-google-client-id',
        message: 'Google client ID is missing from app.json.',
      };
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
