/**
 * Firebase JS SDK initialization for Pakalorie FYP.
 *
 * This keeps the app compatible with Expo Go (`npx expo start` -> QR scan)
 * for the normal email/password + Firestore flows. Native config files
 * (`google-services.json`, `GoogleService-Info.plist`) are not used by this
 * path; Firebase config comes from EXPO_PUBLIC_* values in `.env`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

function assertFirebaseConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase Expo env values: ${missing.join(', ')}. ` +
        'Fill EXPO_PUBLIC_FIREBASE_* in .env before running the app.'
    );
  }
}

function getAsyncStoragePersistence(storage: typeof AsyncStorage): Persistence {
  class ReactNativeAsyncStoragePersistence {
    static type = 'LOCAL' as const;
    readonly type = 'LOCAL' as const;

    async _isAvailable(): Promise<boolean> {
      try {
        const testKey = 'firebase:storage-test';
        await storage.setItem(testKey, '1');
        await storage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    }

    _set(key: string, value: unknown): Promise<void> {
      return storage.setItem(key, JSON.stringify(value));
    }

    async _get<T>(key: string): Promise<T | null> {
      const json = await storage.getItem(key);
      return json ? (JSON.parse(json) as T) : null;
    }

    _remove(key: string): Promise<void> {
      return storage.removeItem(key);
    }

    _addListener(): void {
      // AsyncStorage does not support cross-context listeners in React Native.
    }

    _removeListener(): void {
      // AsyncStorage does not support cross-context listeners in React Native.
    }
  }

  return ReactNativeAsyncStoragePersistence as unknown as Persistence;
}

function createAuth(app: FirebaseApp): Auth {
  try {
    return initializeAuth(app, {
      persistence: getAsyncStoragePersistence(AsyncStorage),
    });
  } catch {
    // Fast Refresh can re-run this module after Auth is already initialized.
    return getAuth(app);
  }
}

assertFirebaseConfig();

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = createAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);

export type { Auth, Firestore, FirebaseUser };
