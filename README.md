# Pakalorie — FYP

AI-powered Pakistani food recognition + calorie tracking mobile app.
SZABIST BS(AI) Final Year Project, Spring 2026 (Milestone v1.0 = P1 Mid, due end of May 2026).

**Repo:** https://github.com/arhamhi/Pakalorie_FYP

## Quick links

- **Master plan:** `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`
- **Product spec:** [`docs/PRD.md`](./docs/PRD.md)
- **Design system:** [`docs/DESIGN.md`](./docs/DESIGN.md)
- **Decisions log:** [`.handoff/DECISIONS.md`](./.handoff/DECISIONS.md)
- **Roadmap:** [`.planning/ROADMAP.md`](./.planning/ROADMAP.md)
- **Live state:** [`.planning/STATE.md`](./.planning/STATE.md) and [`.handoff/STATE.md`](./.handoff/STATE.md)
- **Codex task queue:** [`.handoff/TO_CODEX.md`](./.handoff/TO_CODEX.md)

## Stack

| Layer | Choice |
|---|---|
| Mobile | React Native / Expo SDK 54, Expo Router, NativeWind, TanStack Query |
| Auth + user data | Firebase Auth + Firestore |
| Food / nutrition data | PostgreSQL behind FastAPI (Python 3.11+) |
| Image recognition (P1 Mid) | Gemini Vision wrapper inside FastAPI (server-side) |
| Image recognition (P1 Final +) | Custom YOLOv8 detector (deferred) |
| Deployment | Render free tier (FastAPI), Supabase / Neon free (Postgres), Firebase Spark |
| Fonts | Geist Sans (UI/body) + Instrument Serif (hero numerics) |

## Workflow

This repo is shared between two AI tools:
- **Claude Code** — UI, mobile app code, design system, supervisor-facing docs
- **Codex CLI** — backend (FastAPI, Postgres), Firebase migration specs, infra, dataset prep

Coordination via `.handoff/`:
- `STATE.md` — single source of truth on current code state
- `TO_CODEX.md` — Claude → Codex task queue
- `TO_CLAUDE.md` — Codex → Claude responses + open questions
- `DECISIONS.md` — append-only architectural decisions log

End-of-session protocol for both tools: update `STATE.md`, write the relevant `TO_*.md`, append any new decisions to `DECISIONS.md`.

## Local setup (mobile app)

**Prerequisite — Firebase Console setup:** the app uses the Firebase JS SDK so it can run in Expo Go. You need:
1. A Firebase project with email/password + Google providers enabled.
2. `EXPO_PUBLIC_FIREBASE_*` values filled in `.env` from Firebase project settings.
3. Google Web/iOS client IDs in `app.json` for the AuthSession path.

`google-services.json` and `GoogleService-Info.plist` can stay at the repo root as local reference files, but they are not used by the Expo Go Firebase JS SDK path.

Then:

```sh
npm install
cp .env.example .env             # fill in API base URL when backend deploys
npx expo start                   # scan QR with Expo Go on Android or iPhone
```

Google OAuth uses `expo-auth-session`. Email/password works in Expo Go; Google sign-in should be verified in a development or production build because Expo Go cannot use the app's custom OAuth scheme.

For shareable EAS cloud builds later (no Mac required for iOS):

```sh
npx eas build --profile development --platform android
npx eas build --profile development --platform ios --simulator   # iOS simulator build, no Apple Dev account needed
npx eas build --profile development --platform ios               # physical iPhone build (requires Apple Dev account)
```

## Local setup (backend, when it exists)

Backend lives in `backend/` (created by Codex in Week 2). Until then, this section is a placeholder.

```sh
# backend/
uv sync       # or: poetry install
docker compose up -d postgres
alembic upgrade head
python -m scripts.seed_foods
uvicorn app.main:app --reload
```

## Status

P1 Mid (updated 2026-05-19) — **Phase 1/2 mobile work in progress**.

Done so far: repo scaffolded, GSD planning artifacts written, Firebase Auth + Firestore profile migration shipped through the JS SDK, auth UI screens shipped, scan/results polish shipped, and the project is back on the `npx expo start` Expo Go path for day-to-day testing.

Current blocker: smoke-test the Expo Go path on device. Google OAuth remains a dev-build/prod-build verification item; use email/password for Expo Go testing.

See [`.planning/STATE.md`](./.planning/STATE.md) for the live phase position.
