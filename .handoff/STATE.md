# STATE — single source of truth on current code state

**Last updated:** 2026-05-19 by Codex (Firebase JS SDK reversal — Expo Go path restored)
**Next action owner:** Arham (smoke-test Expo Go auth + scan flow), then Claude Code (decide whether Google OAuth needs a dev-build verification before P1 Mid demo).

---

## Repo state

- Forked from `C:\Users\Arham\OneDrive\Desktop\AI Work\Pakalorie_v2\app` on 2026-05-07.
- Pushed to https://github.com/arhamhi/Pakalorie_FYP (private).
- Branch: `main`, tracking `origin/main`.
- Firebase Console fully set up (project created, providers enabled, Android + iOS apps registered, Firestore in Standard edition / region `asia-south1`).
- `google-services.json` and `GoogleService-Info.plist` are present at repo root (gitignored) but are reference files only now; the Expo Go path reads Firebase config from `.env`.
- `app.json` keeps Google Web/iOS client IDs for the AuthSession path. Native Firebase/Google config plugins were removed.

## What works

- All 14 v2 tab screens compile (Expo SDK 54, NativeWind, Expo Router, TanStack Query).
- Color tokens defined in `src/constants/colors.ts` — surface/text/accent semantic tokens, light + dark.
- 3 accents already live: green `#1BAD66`, gold `#FFC107`, coral `#FF6B6B`.
- **Day 2:** Firebase + Google Sign-In + Geist + Instrument Serif installed.
- **Day 2 / revised 2026-05-19:** `src/lib/firebase.ts` initializes the Firebase JS SDK from `EXPO_PUBLIC_FIREBASE_*` values and configures AsyncStorage-backed auth persistence.
- **Day 2 / revised 2026-05-19:** `src/contexts/AuthContext.tsx` uses Firebase JS Auth + Firestore modular APIs. API surface preserved except `signInWithGoogle` now receives an AuthSession ID token.
- **Day 2:** `src/types/profile.ts` defines Firestore-shaped Profile (re-exported from `database.ts` for backwards-compat).
- **Day 2 / revised 2026-05-19:** `src/lib/authErrors.ts` normalizes Firebase + Google AuthSession errors into project `AuthError` shape.
- **NEW (Day 3):** `src/constants/fonts.ts` exports `FontFamily` + `Type` token system (Geist + Instrument Serif).
- **NEW (Day 3):** `src/constants/spacing.ts` exports `Spacing` (8pt grid) + `Radius` tokens.
- **NEW (Day 3 / revised 2026-05-19):** `app/_layout.tsx` loads Geist + Instrument Serif (legacy fonts kept loaded so un-migrated v2 screens keep rendering). Native Google configuration was removed.
- **NEW (Day 3):** `app/index.tsx` is now a pure auth-state router → `/(auth)/welcome` for unauthed users, `/onboarding/goal` for authed-but-not-onboarded users, `/(tabs)` otherwise.
- **NEW (Day 3):** `app/(auth)/{_layout,welcome,login,signup,forgot-password}.tsx` shipped with Geist + 70/20/10 token styling.
- **NEW (Day 3):** `src/components/auth/AuthFormPrimitives.tsx` — shared atoms (AuthHeader, AuthInput, PrimaryButton, GoogleButton, Divider, FootLink) used across the form screens.
- **NEW (Day 3):** TypeScript clean across all Day 3 files. Pre-existing v2 errors unchanged (still documented for Phase 2).
- **NEW (Day 3.5):** Phosphor adopted (`phosphor-react-native`). All new code uses `*Icon` exports; `@expo/vector-icons` banned in new code.
- **NEW (Day 4-5):** `app/(tabs)/scan.tsx` rewritten against DESIGN.md §5 — Phosphor icons, Geist + Instrument Serif typography, 70/20/10 tokens. Hero numeric (Instrument Serif), 4-card macro grid (now includes Fiber), confidence pill, alternatives card when confidence <70%, medical disclaimer footer, "Save to history" sticky CTA, denied-permission card with "Open settings" fallback. Servings stepper / modifiers / meal type / notes preserved from v2 but restyled. Type-check clean for the rewritten file.
- **NEW (2026-05-19):** `src/hooks/useGoogleAuthSession.ts` wires Google OAuth through `expo-auth-session`. It deliberately returns a clear Expo Go error because OAuth needs a development/production build with the app's custom scheme.

## What's broken / stubbed

- Scan/auth flows haven't been smoke-tested on device yet — Arham to run `npx expo start`, scan with Expo Go, and exercise: welcome → signup/login with email → scan → result → save → history.
- Google OAuth is code-wired but not an Expo Go acceptance item. Test it in a dev/production build only if it must appear in the P1 Mid live demo.
- Save-to-history STILL writes to Supabase `food_logs`, not Firestore. The v2 read paths in `app/(tabs)/index.tsx` and `app/(tabs)/calendar-log.tsx` still read from Supabase, so flipping save in isolation breaks history. Migration paired with CDX-001 (Codex's Firestore migration spec).
- AuthContext methods `signInWithApple`, `signInWithPhone`, `verifyOtp` throw `not-implemented` — deferred to P1 Final / P2.
- Pre-existing v2 type errors in `chat.tsx`, `notifications.tsx`, `search.tsx`, `index.tsx`, `settings.tsx` — not from auth/scan migration; will fix when those screens are touched.
- v2's existing `app/onboarding/auth.tsx` is now superseded by the new `(auth)` group but still on disk; only reachable from the onboarding flow. Decision pending: rip it out or wire onboarding to redirect to `(auth)/login`.
- v2 legacy screens still reference `@expo/vector-icons` + PlusJakartaSans/IBMPlexMono. New code is on Phosphor + Geist; sweep happens piecemeal as those screens get touched.
- `android/` folder is still committed from the earlier native prebuild. It is stale for the Expo Go path; do not treat it as source of truth unless a future session intentionally regenerates it.
- No backend service of our own yet — Gemini calls still go from client (insecure; moves to FastAPI in Week 3).
- No FastAPI backend folder yet (Codex creates `backend/` in Week 2).

## Active P1 Mid scope (per FYP doc, due end of May 2026)

1. **Authentication & User Management** — Firebase Auth (email/password + Google), Firestore `users` doc.
2. **Core Mobile UI — Capture & Results** — polish v2 scan + results screens with new tokens + fonts.
3. **Food Database API** — new FastAPI service + PostgreSQL, deployed on Render free tier.

Deferred to P1 Final / P2: YOLOv8, MiDaS depth, Health Sync, Gemini Coach (Ustad), dark mode polish.

## What's next (immediate)

1. **Arham smoke-test (Expo Go auth + scan path):**
   ```sh
   npx expo start
   ```
   Walk: welcome → "Create account" → email/password → land on home → tap Scan tab → grant camera → capture chicken karahi → analyzing overlay → result card shows hero calorie number, 4-card macro grid, confidence pill, "Save to history" → save → check entry appears in home tab + calendar-log. Report any visual or runtime regressions.
2. **Claude Code next:** decide whether Google OAuth is needed for the live P1 Mid demo. If yes, verify it in a development/production build; if no, keep the live demo on email/password through Expo Go.
3. **Codex track:** CDX-001 — Firestore migration spec for non-auth collections. See `TO_CODEX.md`.

## Plan reference

Full plan at `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`.
