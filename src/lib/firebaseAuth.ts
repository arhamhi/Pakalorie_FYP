/**
 * Expo Go-safe Firebase Auth exports.
 *
 * Metro resolves `firebase/auth` to Firebase's React Native Auth bundle, while
 * `firebase/app` resolves through the ESM app bundle. In Expo Go that can split
 * Firebase's component registry and crash with:
 * "Component auth has not been registered yet".
 *
 * Importing the browser ESM Auth bundle directly keeps Auth on the same ESM
 * registry as `firebase/app`. Email/password and credential sign-in are pure JS
 * API calls, so they work in Expo Go.
 */

export {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  initializeAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from '../../node_modules/@firebase/auth/dist/esm2017/index.js';

export type {
  Auth,
  Persistence,
  User as FirebaseUser,
} from 'firebase/auth';
