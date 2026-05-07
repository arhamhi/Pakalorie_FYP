# STATE — single source of truth on current code state

**Last updated:** 2026-05-08 by Claude Code (Day 2 — Firebase migration in progress)
**Next action owner:** Arham (Firebase Console setup), then Claude Code (auth UI screens)

---

## Repo state

- Forked from `C:\Users\Arham\OneDrive\Desktop\AI Work\Pakalorie_v2\app` on 2026-05-07.
- Pushed to https://github.com/arhamhi/Pakalorie_FYP (private) on 2026-05-08.
- Branch: `main`, tracking `origin/main`.
- `.env` file from v2 is gitignored. Supabase keys still present locally; Firebase replaces auth.

## What works

- All 14 v2 tab screens compile (Expo SDK 54, NativeWind, Expo Router, TanStack Query).
- Color tokens defined in `src/constants/colors.ts` — surface/text/accent semantic tokens, light + dark.
- 3 accents already live: green `#1BAD66`, gold `#FFC107`, coral `#FF6B6B`.
- **NEW (Day 2):** Firebase + Google Sign-In + expo-dev-client + Geist + Instrument Serif installed.
- **NEW (Day 2):** `src/lib/firebase.ts` initializes RNFirebase + Google Sign-In wrapper.
- **NEW (Day 2):** `src/contexts/AuthContext.tsx` rewritten to use Firebase Auth + Firestore. API surface preserved (consumer screens unchanged). Type-check passes for the new code path.
- **NEW (Day 2):** `src/types/profile.ts` defines Firestore-shaped Profile (re-exported from `database.ts` for backwards-compat).
- **NEW (Day 2):** `src/lib/authErrors.ts` normalizes Firebase + Google Sign-In errors into project `AuthError` shape.

## What's broken / stubbed

- **BLOCKING — Arham must do in Firebase Console:** create the project, enable email/password + Google providers, download `google-services.json` and drop it at repo root. Until this lands, the app builds but Firebase calls will fail at runtime.
- **BLOCKING — Arham must add:** the Web OAuth client ID (from Firebase Auth Google config) to `app.json` → `extra.googleSignInWebClientId`, and the root layout must call `configureGoogleSignIn(...)` once at app start.
- `app/(auth)/` screens still empty shells — auth UI not built yet (Day 3-4 work).
- AuthContext methods `signInWithApple`, `signInWithPhone`, `verifyOtp` throw `not-implemented` — deferred to P1 Final / P2.
- Pre-existing v2 type errors in `chat.tsx`, `notifications.tsx`, `search.tsx`, `index.tsx` — not from auth migration; will fix when those screens are touched in Phase 2.
- No backend service of our own yet — Gemini calls still go from client (insecure; moves to FastAPI in Week 3).
- No FastAPI backend folder yet (Codex creates `backend/` in Week 2).

## Active P1 Mid scope (per FYP doc, due end of May 2026)

1. **Authentication & User Management** — Firebase Auth (email/password + Google), Firestore `users` doc.
2. **Core Mobile UI — Capture & Results** — polish v2 scan + results screens with new tokens + fonts.
3. **Food Database API** — new FastAPI service + PostgreSQL, deployed on Render free tier.

Deferred to P1 Final / P2: YOLOv8, MiDaS depth, Health Sync, Gemini Coach (Ustad), dark mode polish.

## What's next (immediate)

1. **Arham (Firebase Console, ~15 min):** Create project, enable providers, download `google-services.json` + (optional) `GoogleService-Info.plist`, copy Web Client ID into `app.json`. See "Firebase Console Setup" section below.
2. **Claude Code (Day 3-4):** Build `app/(auth)/` screens (welcome, login, signup, forgot-password) using the new AuthContext + design tokens.
3. **Claude Code (Day 4-5):** Wire `configureGoogleSignIn(extra.googleSignInWebClientId)` in `app/_layout.tsx` and add auth-gated routing.
4. **Codex track (parallel, Day 6-7):** CDX-001 — Firestore migration spec for non-auth collections. See `TO_CODEX.md`.

## Firebase Console Setup (Arham — paste these into your browser)

1. Open https://console.firebase.google.com → **Add project** → name it `pakalorie-fyp` (or `Pakalorie FYP`). Skip Google Analytics for now.
2. **Authentication** → Get started → **Sign-in method**:
   - Enable **Email/Password** (toggle on, save)
   - Enable **Google** (toggle on, set support email, save). After saving, expand the Google provider — copy the **Web SDK configuration → Web client ID** (looks like `xxxxxxxxxxxx-yyyyyy.apps.googleusercontent.com`). Paste into `app.json` → `extra.googleSignInWebClientId`.
3. **Project settings (gear icon) → General → Your apps**:
   - Click the **Android** icon. Package name: `com.redolanse.pakaloriefyp`. SHA-1 cert (run locally): `cd android && ./gradlew signingReport` after first `expo prebuild --platform android` — paste it in. Download `google-services.json` and drop at repo root.
   - (Optional, iOS deferred) Click the **iOS** icon. Bundle ID: `com.redolanse.pakaloriefyp`. Download `GoogleService-Info.plist` and drop at repo root.
4. **Firestore Database** → Create database → start in **production mode** (we'll add per-user rules in CDX-001).
5. Add `google-services.json` and `GoogleService-Info.plist` to `.gitignore` (sensitive — they identify the Firebase project but don't contain admin secrets; still safer to keep out of git for a private FYP). Done.

After you finish step 5, ping me and I'll start the auth UI screens.

## Plan reference

Full plan at `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`.
