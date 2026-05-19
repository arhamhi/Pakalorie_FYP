import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore, type FirebaseUser } from '../lib/firebase';
import { normalizeAuthError } from '../lib/authErrors';
import { toAuthUser } from '../types/auth';
import type { AuthUser } from '../types/auth';
import { DEFAULT_PROFILE, type Profile } from '../types/profile';

/**
 * AuthContext — Firebase JS SDK-backed auth + Firestore profile.
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
  firebaseUser: FirebaseUser | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const snapshot = await getDoc(doc(firestore, USERS_COLLECTION, uid));
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
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
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
    async (fbUser: FirebaseUser) => {
      const ref = doc(firestore, USERS_COLLECTION, fbUser.uid);
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) return;

      // First sign-in — seed the profile doc with defaults + display info.
      const seed: Profile = {
        ...DEFAULT_PROFILE,
        id: fbUser.uid,
        display_name: fbUser.displayName ?? null,
        avatar_url: fbUser.photoURL ?? null,
        updated_at: new Date().toISOString(),
      };
      await setDoc(ref, seed, { merge: true });
    },
    []
  );

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await ensureProfileDocument(cred.user);
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }, [ensureProfileDocument]);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await ensureProfileDocument(cred.user);
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }, [ensureProfileDocument]);

  const signInWithGoogle = useCallback(async (idToken: string) => {
    try {
      if (!idToken) {
        throw new Error('Google sign-in did not return an ID token.');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const userCred = await signInWithCredential(auth, credential);
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
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
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

      const ref = doc(firestore, USERS_COLLECTION, firebaseUser.uid);
      const next = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      await setDoc(ref, next, { merge: true });

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
