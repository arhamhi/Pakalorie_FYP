# STATE — single source of truth on current code state

**Last updated:** 2026-05-07 by Claude Code (Day 1 setup)
**Next action owner:** Claude Code (Firebase project + AuthContext rewrite)

---

## Repo state

- Forked from `C:\Users\Arham\OneDrive\Desktop\AI Work\Pakalorie_v2\app` on 2026-05-07.
- `git init` done on branch `main`. No initial commit yet — pending Day 1 sign-off.
- GitHub remote: not yet pushed. Planned repo name: `FYP-Pakalorie` (UK GitHub account).
- `.env` file from v2 is gitignored. v2 Supabase keys present but will be replaced by Firebase config.

## What works

- All 14 v2 tab screens compile (Expo SDK 54, NativeWind, Expo Router, TanStack Query).
- Supabase auth + data layer functional (will be migrated to Firebase + Firestore + FastAPI per FYP doc).
- Gemini Vision integration in `src/lib/gemini.ts` works (will be moved server-side to FastAPI).
- Color tokens defined in `src/constants/colors.ts` — surface/text/accent semantic tokens, light + dark.
- 3 accents already live: green `#1BAD66`, gold `#FFC107`, coral `#FF6B6B`.

## What's broken / stubbed

- `app/(auth)/` screens are empty shells — auth UI not built (logic in AuthContext exists).
- No backend service of our own yet — Gemini calls go directly from client (insecure, must move to FastAPI).
- No FastAPI backend folder yet (Codex will create `backend/` in Week 2).
- No Firebase project yet.
- Fonts: currently system default. Plan: Geist Sans (UI/body) + Instrument Serif (hero numerics).

## Active P1 Mid scope (per FYP doc, due end of May 2026)

1. **Authentication & User Management** — Firebase Auth (email/password + Google), Firestore `users` doc.
2. **Core Mobile UI — Capture & Results** — polish v2 scan + results screens with new tokens + fonts.
3. **Food Database API** — new FastAPI service + PostgreSQL, deployed on Render free tier.

Deferred to P1 Final / P2: YOLOv8, MiDaS depth, Health Sync, Gemini Coach (Ustad), dark mode polish.

## What's next (immediate)

1. Day 2: Create Firebase project `pakalorie-fyp`. Enable email/password + Google providers.
2. Day 3-4: Rewrite `src/contexts/AuthContext.tsx` — Supabase calls → Firebase equivalents. Keep context API the same.
3. Day 5-7: Build `app/(auth)/` screens (login, signup, welcome, forgot-password) styled with new design system.
4. Codex track (parallel): see `TO_CODEX.md` for Firestore data migration tasks.

## Plan reference

Full plan at `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`.
