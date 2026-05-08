# STATE — single source of truth on current code state

**Last updated:** 2026-05-08 by Claude Code (Day 3 — auth UI screens shipped)
**Next action owner:** Arham (smoke-test on `npx expo run:android` once prebuild completes), then Claude Code (Day 4-5: capture/results polish).

---

## Repo state

- Forked from `C:\Users\Arham\OneDrive\Desktop\AI Work\Pakalorie_v2\app` on 2026-05-07.
- Pushed to https://github.com/arhamhi/Pakalorie_FYP (private).
- Branch: `main`, tracking `origin/main`.
- Firebase Console fully set up (project created, providers enabled, Android + iOS apps registered, Firestore in Standard edition / region `asia-south1`).
- `google-services.json` and `GoogleService-Info.plist` present at repo root (gitignored).
- `app.json` populated with all three IDs (Web Client ID, iOS Client ID, REVERSED_CLIENT_ID for `iosUrlScheme`).

## What works

- All 14 v2 tab screens compile (Expo SDK 54, NativeWind, Expo Router, TanStack Query).
- Color tokens defined in `src/constants/colors.ts` — surface/text/accent semantic tokens, light + dark.
- 3 accents already live: green `#1BAD66`, gold `#FFC107`, coral `#FF6B6B`.
- **Day 2:** Firebase + Google Sign-In + expo-dev-client + Geist + Instrument Serif installed.
- **Day 2:** `src/lib/firebase.ts` initializes RNFirebase + Google Sign-In wrapper.
- **Day 2:** `src/contexts/AuthContext.tsx` rewritten to use Firebase Auth + Firestore. API surface preserved (consumer screens unchanged).
- **Day 2:** `src/types/profile.ts` defines Firestore-shaped Profile (re-exported from `database.ts` for backwards-compat).
- **Day 2:** `src/lib/authErrors.ts` normalizes Firebase + Google Sign-In errors into project `AuthError` shape.
- **NEW (Day 3):** `src/constants/fonts.ts` exports `FontFamily` + `Type` token system (Geist + Instrument Serif).
- **NEW (Day 3):** `src/constants/spacing.ts` exports `Spacing` (8pt grid) + `Radius` tokens.
- **NEW (Day 3):** `app/_layout.tsx` loads Geist + Instrument Serif (legacy fonts kept loaded so un-migrated v2 screens keep rendering); calls `configureGoogleSignIn(extra.googleSignInWebClientId)` once at app start.
- **NEW (Day 3):** `app/index.tsx` is now a pure auth-state router → `/(auth)/welcome` for unauthed users, `/onboarding/goal` for authed-but-not-onboarded users, `/(tabs)` otherwise.
- **NEW (Day 3):** `app/(auth)/{_layout,welcome,login,signup,forgot-password}.tsx` shipped with Geist + 70/20/10 token styling.
- **NEW (Day 3):** `src/components/auth/AuthFormPrimitives.tsx` — shared atoms (AuthHeader, AuthInput, PrimaryButton, GoogleButton, Divider, FootLink) used across the form screens.
- **NEW (Day 3):** TypeScript clean across all Day 3 files. Pre-existing v2 errors unchanged (still documented for Phase 2).

## What's broken / stubbed

- Build hasn't been smoke-tested on device yet — `npx expo prebuild` + `npx expo run:android` is the next verification step.
- AuthContext methods `signInWithApple`, `signInWithPhone`, `verifyOtp` throw `not-implemented` — deferred to P1 Final / P2.
- Pre-existing v2 type errors in `chat.tsx`, `notifications.tsx`, `search.tsx`, `index.tsx`, `settings.tsx` — not from auth migration; will fix when those screens are touched in Phase 2.
- v2's existing `app/onboarding/auth.tsx` is now superseded by the new `(auth)` group but still on disk; it's only reachable from the onboarding flow (`app/onboarding/_layout.tsx` references). Decision pending: rip it out in Phase 2 polish or wire onboarding to redirect to `(auth)/login` instead.
- No backend service of our own yet — Gemini calls still go from client (insecure; moves to FastAPI in Week 3).
- No FastAPI backend folder yet (Codex creates `backend/` in Week 2).

## Active P1 Mid scope (per FYP doc, due end of May 2026)

1. **Authentication & User Management** — Firebase Auth (email/password + Google), Firestore `users` doc.
2. **Core Mobile UI — Capture & Results** — polish v2 scan + results screens with new tokens + fonts.
3. **Food Database API** — new FastAPI service + PostgreSQL, deployed on Render free tier.

Deferred to P1 Final / P2: YOLOv8, MiDaS depth, Health Sync, Gemini Coach (Ustad), dark mode polish.

## What's next (immediate)

1. **Arham smoke-test:**
   ```sh
   npx expo prebuild --clean
   npx expo run:android
   ```
   Verify on emulator/device: welcome screen renders → "Create account" path works (signup writes a Firestore `users/{uid}` doc) → sign out → sign in → Google flow → "Forgot password" sends an email. Report any auth runtime errors back here.
2. **Claude Code (Day 4-5):** Capture/results UI polish pass — apply Geist + 70/20/10 tokens to `app/(tabs)/scan.tsx` (capture flow) and the results card. Begins Phase 2 (UI-01..10).
3. **Codex track (parallel, Day 6-7):** CDX-001 — Firestore migration spec for non-auth collections. See `TO_CODEX.md`.

## Plan reference

Full plan at `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`.
