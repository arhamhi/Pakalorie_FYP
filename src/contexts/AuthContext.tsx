import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, firestore, GoogleSignin, type FirebaseAuthTypes } from '../lib/firebase';
import { normalizeAuthError } from '../lib/authErrors';
import { toAuthUser } from '../types/auth';
import type { AuthUser } from '../types/auth';
import { DEFAULT_PROFILE, type Profile } from '../types/profile';

/**
 * AuthContext — Firebase-backed auth + Firestore profile.
 *
 * Replaces v2's Supabase implementation. The public API is intentionally
 * close to the v2 shape so consumer screens don't need rewrites:
 *   - `user.id` still resolves (mapped from Firebase UID)
 *   - `signInWithGoogle()`, `signOut()`, `updateProfile()`, `refreshProfile()`
 *     keep their names
 *
 * P1 Mid scope changes vs. v2:
 *   - NEW: `signInWithEmail(email, password)` + `signUpWithEmail(...)` +
 *          `sendPasswordReset(email)` (FYP doc requires email/password flow)
 *   - DEFERRED: Apple Sign-In, Phone OTP — methods exist but throw
 *     'not-implemented' so consumer screens fail loudly instead of silently
 */

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: FirebaseAuthTypes.User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_COLLECTION = 'users';

function notImplemented(method: string): never {
  throw new Error(
    `${method} is deferred to P1 Final / P2. Not available in P1 Mid (May 2026 scope).`
  );
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const snapshot = await firestore().collection(USERS_COLLECTION).doc(uid).get();
      if (snapshot.exists()) {
        setProfile(snapshot.data() as Profile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      // Profile fetch failures should not block sign-in. Log + continue.
      // (production: replace with proper logger)
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser);
      setUser(toAuthUser(fbUser));

      if (fbUser) {
        await fetchProfile(fbUser.uid);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [fetchProfile]);

  const ensureProfileDocument = useCallback(
    async (fbUser: FirebaseAuthTypes.User) => {
      const ref = firestore().collection(USERS_COLLECTION).doc(fbUser.uid);
      const snapshot = await ref.get();
      if (snapshot.exists()) return;

      // First sign-in — seed the profile doc with defaults + display info.
      const seed: Profile = {
        ...DEFAULT_PROFILE,
        id: fbUser.uid,
        display_name: fbUser.displayName ?? null,
        avatar_url: fbUser.photoURL ?? null,
        updated_at: new Date().toISOString(),
      };
      await ref.set(seed, { merge: true });
    },
    []
  );

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const cred = await auth().signInWithEmailAndPassword(email, password);
      await ensureProfileDocument(cred.user);
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }, [ensureProfileDocument]);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const cred = await auth().createUserWithEmailAndPassword(email, password);
      await ensureProfileDocument(cred.user);
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }, [ensureProfileDocument]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      const idToken =
        // newer SDK shape: result.data.idToken; older: result.idToken
        (result as { data?: { idToken?: string }; idToken?: string }).data?.idToken ??
        (result as { idToken?: string }).idToken;

      if (!idToken) {
        throw new Error('Google sign-in did not return an ID token.');
      }

      const credential = auth.GoogleAuthProvider.credential(idToken);
      const userCred = await auth().signInWithCredential(credential);
      await ensureProfileDocument(userCred.user);
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }, [ensureProfileDocument]);

  const signInWithApple = useCallback(async () => {
    notImplemented('signInWithApple');
  }, []);

  const signInWithPhone = useCallback(async (_phone: string) => {
    notImplemented('signInWithPhone');
  }, []);

  const verifyOtp = useCallback(async (_phone: string, _token: string) => {
    notImplemented('verifyOtp');
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Best-effort Google sign-out — ignore errors if the user isn't a Google user
      try {
        await GoogleSignin.signOut();
      } catch {
        // not signed in via Google; ignore
      }
      await auth().signOut();
      setProfile(null);
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (firebaseUser) {
      await fetchProfile(firebaseUser.uid);
    }
  }, [firebaseUser, fetchProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!firebaseUser) {
        throw new Error('No user logged in.');
      }

      const ref = firestore().collection(USERS_COLLECTION).doc(firebaseUser.uid);
      const next = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      await ref.set(next, { merge: true });

      // Optimistic local update
      setProfile((prev) => (prev ? ({ ...prev, ...next } as Profile) : null));
    },
    [firebaseUser]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        profile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signInWithPhone,
        verifyOtp,
        sendPasswordReset,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
