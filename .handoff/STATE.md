# STATE — single source of truth on current code state

**Last updated:** 2026-05-08 by Claude Code (Day 2 — Firebase migration in progress)
**Next action owner:** Arham (Firebase Console setup), then Claude Code (auth UI screens)
**Protocol note:** 2026-05-07 Codex added standing agent instructions in `AGENTS.md`, `.agents/CODEX.md`, `CLAUDE.md`, and `.claude/CLAUDE.md`.

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
- **NEW:** Agent operating instructions added: `AGENTS.md` for Codex, `.agents/CODEX.md` as Codex lane pointer, `CLAUDE.md` as root Claude pointer, and `.claude/CLAUDE.md` for Claude Code. All future sessions should start from `.handoff/STATE.md` and end by updating handoff files.

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

P1 Mid now ships **both Android and iOS**. iOS demo on a physical iPhone requires an Apple Developer account ($99/yr) — defer the purchase until late May. iOS simulator builds via EAS work without it; only TestFlight / physical-device installs need the cert.

### 1. Create the project
Open https://console.firebase.google.com → **Add project** → name it `Pakalorie FYP`. Skip Google Analytics for now.

### 2. Enable auth providers
**Authentication → Get started → Sign-in method**:
- Enable **Email/Password** (toggle on, save).
- Enable **Google** (toggle on, set support email, save). After saving, expand the Google card and note the **Web SDK configuration**:
  - **Web client ID** — copy this. It's used on both Android and iOS to verify ID tokens server-side. Format: `xxxxxxxxxxxx-yyyyyy.apps.googleusercontent.com`.

### 3. Register the Android app
**Project settings (gear icon) → General → Your apps → Add app → Android**:
- Package name: `com.redolanse.pakaloriefyp`
- App nickname: `Pakalorie Android`
- SHA-1 cert: skip for now. Required only for physical-device Google Sign-In via EAS — we'll add it during EAS build prep using `cd android && ./gradlew signingReport` after first `npx expo prebuild --platform android`.
- Click **Register app** → **Download `google-services.json`** → drop it at repo root: `C:\Users\Arham\OneDrive\Desktop\Uni\FYP\pakalorie-fyp\google-services.json`.

### 4. Register the iOS app
**Project settings → General → Your apps → Add app → iOS**:
- Bundle ID: `com.redolanse.pakaloriefyp` (same as Android, for consistency).
- App nickname: `Pakalorie iOS`.
- App Store ID: leave blank.
- Click **Register app** → **Download `GoogleService-Info.plist`** → drop at repo root: `C:\Users\Arham\OneDrive\Desktop\Uni\FYP\pakalorie-fyp\GoogleService-Info.plist`.
- Open `GoogleService-Info.plist` in any text editor and find these two values:
  - `CLIENT_ID` — looks like `xxxxxxxxxxxx-zzzzzz.apps.googleusercontent.com`. **Copy it.**
  - `REVERSED_CLIENT_ID` — looks like `com.googleusercontent.apps.xxxxxxxxxxxx-zzzzzz`. **Copy it.**

### 5. Create Firestore
**Firestore Database → Create database → production mode → region `asia-south1` (Mumbai)**. Per-user security rules will land in CDX-001.

### 6. Paste the IDs into `app.json`
Three placeholders to fill in:

```jsonc
"plugins": [
  // ...
  [
    "@react-native-google-signin/google-signin",
    {
      "iosUrlScheme": "PASTE_REVERSED_CLIENT_ID_HERE"   // step 4: REVERSED_CLIENT_ID
    }
  ],
  // ...
],
"extra": {
  "googleSignInWebClientId": "PASTE_WEB_CLIENT_ID_HERE",  // step 2: Web client ID
  "googleSignInIosClientId": "PASTE_IOS_CLIENT_ID_HERE"   // step 4: CLIENT_ID
}
```

### 7. gitignore confirmation
`google-services.json` and `GoogleService-Info.plist` are already gitignored. They aren't secrets but should stay out of the public-facing surface. Keep them locally only.

### 8. Apple Developer Account (defer to late May)
Required only for: physical iPhone demo (TestFlight or ad-hoc), or App Store submission.
Not required for: iOS simulator builds, local dev, EAS cloud builds for simulator.
Cost: $99/year. Buy at https://developer.apple.com/programs/ when ready.

---

After you finish step 6, ping me with **"firebase done"** and I'll start the auth UI screens.

## Plan reference

Full plan at `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`.
