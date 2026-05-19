# DECISIONS — append-only architectural decisions log

Format: `## YYYY-MM-DD — <decision title>` then the decision, the rationale, and the alternatives we rejected.

---

## 2026-05-07 — Stack: Firebase Auth + Firestore + FastAPI + PostgreSQL

**Decision:** Authentication and user-data plane uses Firebase (Auth + Firestore). Food/nutrition data uses our own FastAPI service backed by PostgreSQL. Image recognition for P1 Mid is a thin Gemini Vision wrapper inside FastAPI; YOLOv8 takes over in P1 Final.

**Why:** FYP Overleaf doc commits us to Firebase + FastAPI + PostgreSQL. Doc compliance > engineering elegance for university grading.

**Rejected:** (a) keep v2's Supabase end-to-end — would deviate from doc and trigger supervisor questions; (b) full Firestore for everything — Firestore is bad at fuzzy text search and joining nutrition × portion data.

---

## 2026-05-07 — Light-mode-only for May; dark mode in June UI sprint

**Decision:** P1 Mid ships light mode only across the 3 in-scope surfaces (auth, capture, results). Token system built dark-ready from day one.

**Why:** Hard 3–4 week timeline. Dark mode polish is one full sprint of QA on its own. Doing both halfway is worse than doing one well.

**Rejected:** "Just keep v2's existing dark mode and add light." — v2's dark mode wasn't designed against the new 70/20/10 token system; would need rework anyway.

---

## 2026-05-07 — Geist Sans + Instrument Serif

**Decision:** Geist Sans (UI/body/headings), Instrument Serif (hero numerics on Results screen). Both via `@expo-google-fonts`. Both OFL-licensed and free.

**Why:** Geist is Vercel's modern grotesque — feels Apple-adjacent without being literal SF copies. Instrument Serif gives the hero calorie number an editorial moment that Cal AI uses to differentiate. Both load cleanly via Google Fonts CDN.

**Rejected:** IBM Plex Mono (v2's pick) — too engineering-flavored for the consumer health vibe. SF Pro — not freely redistributable. Inter — too generic.

---

## 2026-05-07 — Codex (backend) + Claude (UI/general) split via .handoff/

**Decision:** Backend (FastAPI, Postgres, Firebase migration spec, infra) goes to Codex CLI. UI, mobile screens, design system, and Arham-authored docs stay with Claude Code. Coordination via `.handoff/{STATE,TO_CODEX,TO_CLAUDE,DECISIONS}.md`.

**Why:** Backend is mostly mechanical translation of specs → code (Codex's sweet spot, cheaper run cost). UI is taste + iteration (Claude's sweet spot). Splitting protects monthly Claude usage budget.

**Rejected:** Single tool for everything — more expensive, more context bloat per session.

---

## 2026-05-07 — GSD plugin used selectively, not on autopilot

**Decision:** Use GSD only for `/gsd-new-milestone` (once at start), `/gsd-plan-phase` (per module), `/gsd-verify-work` (before checkpoints), `/gsd-extract-learnings` (after phases). Skip `/gsd-execute-phase` (usage-hungry) — execution happens manually via Claude+Codex.

**Why:** GSD is opinionated and consumes a lot of model usage per phase. Selective use captures the planning-discipline value without burning the monthly quota mid-sprint.

**Rejected:** Full GSD adoption — quota risk during cash crunch.

---

## 2026-05-07 — Repo name: `Pakalorie_FYP`

**Decision:** GitHub repo named `Pakalorie_FYP` (matches the Stitch design project name). Pushed to https://github.com/arhamhi/Pakalorie_FYP (private).

**Why:** Keeps repo name aligned with the Stitch project so cross-references are obvious. Underscore separator distinguishes from any pakalorie folder Arham has lying around.

**Rejected:** `FYP-Pakalorie` (initial idea — replaced for naming consistency with Stitch); `pakalorie` (collision risk).

---

## 2026-05-08 — Firebase via @react-native-firebase (native), not JS SDK

**Decision:** Use `@react-native-firebase/{app,auth,firestore}` (native modules) over the JS `firebase` SDK. Google Sign-In via `@react-native-google-signin/google-signin`. Required `expo-dev-client` + EAS dev build — Expo Go path is dropped.

**Why:** FYP demo runs on a real Android device via EAS dev build anyway. Native Firebase SDK gives proper auth persistence, native Google Sign-In flow (no AuthSession redirect dance), and matches what supervisors expect when they look at the code. JS SDK on RN has known issues with auth persistence and forces the OAuth redirect flow.

**Rejected:** Firebase JS SDK (`firebase` npm package) — cleaner Expo Go story but breaks our requirement for native Google Sign-In and triggers persistence warnings on RN.

**Cost:** Lose the ability to test in Expo Go from now on. All future testing requires `expo run:android` or an EAS dev build install.

---

## 2026-05-08 — Profile type relocated to src/types/profile.ts

**Decision:** Created `src/types/profile.ts` with a Firestore-shaped Profile interface. `src/types/database.ts` now re-exports it (backwards-compat with v2 screens that import from there).

**Why:** Supabase-generated `Tables<'profiles'>` was tied to the old schema. New fields (`onboarding_complete`, `accent_preference`, `is_premium`) needed adding without touching the auto-generated Supabase types file.

**Rejected:** Editing `database.ts` directly — that file is auto-generated; manual edits would be overwritten if anyone ever ran the Supabase type generator again.

---

## 2026-05-08 — iOS added to P1 Mid scope (was Android-only)

**Decision:** Both Android and iOS now ship as part of P1 Mid demo. Android remains the primary demo target (Arham's daily-driver phone, EAS dev build). iOS ships via EAS cloud build for simulator at minimum; physical iPhone via TestFlight is best-effort and gated on Apple Developer account purchase ($99/yr) — purchase deferred to late May.

**Why:** App Store reach matters for the FYP narrative even if we never submit. Adding iOS now (when the codebase is small and Firebase config is being set up anyway) costs less than adding it in P1 Final after layouts have drifted Android-first. EAS cloud builds don't require a Mac, removing the historical blocker.

**Cost:** +2 acceptance criteria (DEMO-06, DEMO-07), one extra Firebase Console step (iOS app registration + GoogleService-Info.plist), iOS-specific URL scheme wiring in `app.json`, and the deferred $99 Apple Dev account spend.

**Rejected:** Keeping iOS out until P2 — would require a separate iOS port pass when Apple Sign-In and HealthKit work starts in P1 Final; cleaner to take the hit now.

---

## 2026-05-08 — Apple Sign-In + Phone OTP stubbed, not removed

**Decision:** AuthContext keeps `signInWithApple`, `signInWithPhone`, `verifyOtp` in its public API but they throw `not-implemented` errors. Methods will be filled in for P1 Final / P2.

**Why:** Preserves the v2 API contract so any existing consumer screens that reference these methods don't fail to compile. Throwing instead of silently returning makes the gap obvious if a screen tries to use them.

**Rejected:** Deleting the methods entirely — would force a sweep of every consumer screen for P1 Mid which is out of scope.
---

## 2026-05-07 - Repo-level agent operating instructions

**Decision:** Add standing instructions for both coding agents: `AGENTS.md` for Codex, `.agents/CODEX.md` as the explicit Codex lane pointer, `CLAUDE.md` as the root Claude pointer, and `.claude/CLAUDE.md` for Claude Code.

**Why:** Pakalorie FYP is now a two-agent workflow. Every fresh session must start from `.handoff/STATE.md`, use the correct queue file, respect ownership boundaries, and update handoff files before ending. This prevents Claude and Codex from drifting or solving the same problem twice.

**Rejected:** Keeping the workflow only in chat memory. Chat context is fragile across sessions; repo-level instructions make the operating rhythm durable.

---

## 2026-05-19 - Reverse native Firebase; Expo Go first

**Decision:** Replace `@react-native-firebase/{app,auth,firestore}` and native Google Sign-In with the Firebase JS SDK (`firebase`) plus `expo-auth-session`. Remove `expo-dev-client`, `expo-build-properties`, native Firebase config plugins, and the Google Sign-In config plugin from `app.json`.

**Why:** Arham needs the old fast loop back: `npx expo start` -> QR -> Expo Go on Android/iPhone. The native-module path was technically cleaner for production Google Sign-In, but it blocked day-to-day FYP demo velocity.

**Scope:** Email/password auth and Firestore profiles are the Expo Go acceptance path. Google OAuth remains code-wired through AuthSession, but Expo Go cannot reliably test OAuth with the app's custom scheme; verify Google in a development or production build if it is needed for the live demo.

**Rejected:** Continuing native Firebase as the default. It forces `expo run:*` or EAS dev builds for every device smoke-test, which is too slow for the May P1 Mid timeline.

---

## 2026-05-19 - Force Firebase Auth through browser ESM in Expo Go

**Decision:** Runtime Auth imports go through `src/lib/firebaseAuth.ts`, which directly imports Firebase Auth's browser ESM bundle. `src/lib/firebase.ts` still uses `firebase/app` and `firebase/firestore`, but Auth no longer imports the React Native/CJS Auth bundle in Expo Go.

**Why:** Metro resolved `firebase/app` and `firebase/auth` through different Firebase app/component registries. That crashed Expo Go at startup with `Component auth has not been registered yet`, then Expo Router reported misleading missing-default-export warnings for every route that imported AuthContext.

**Scope:** Email/password auth and credential sign-in stay pure JS and Expo Go-compatible. Auth persistence is still backed by AsyncStorage via a local persistence class.

**Rejected:** Returning to native Firebase/dev-client as the default. That would fix the registry mismatch but would again break Arham's fast `npx expo start` -> Expo Go QR workflow.
