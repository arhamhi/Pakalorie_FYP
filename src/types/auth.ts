import type { FirebaseUser } from '../lib/firebase';

/**
 * Project-level user shape. Decouples consumer screens from
 * Firebase vendor types so we can swap auth providers later without touching
 * every screen.
 *
 * `id` is the Firebase UID. We keep the field name `id` (not `uid`) so the
 * existing v2 screens that read `user.id` keep working without changes.
 */
export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  providerId: string | null;
}

export function toAuthUser(firebaseUser: FirebaseUser | null): AuthUser | null {
  if (!firebaseUser) return null;

  // Pick the primary provider (the first non-firebase provider, if any)
  const externalProvider = firebaseUser.providerData.find(
    (p) => p.providerId !== 'firebase'
  );

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
    isAnonymous: firebaseUser.isAnonymous,
    providerId: externalProvider?.providerId ?? 'password',
  };
}

/**
 * Auth error shape we normalize Firebase + Google AuthSession errors into so the
 * UI layer can display localized messages without parsing vendor codes.
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export type AuthErrorCode =
  | 'invalid-email'
  | 'invalid-credentials'
  | 'email-already-in-use'
  | 'weak-password'
  | 'user-not-found'
  | 'network-request-failed'
  | 'too-many-requests'
  | 'google-sign-in-cancelled'
  | 'google-sign-in-in-progress'
  | 'google-play-services-unavailable'
  | 'google-auth-requires-dev-build'
  | 'missing-google-client-id'
  | 'not-implemented'
  | 'unknown';
