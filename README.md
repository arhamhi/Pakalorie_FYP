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

**Prerequisite — Firebase Console setup:** the app uses `@react-native-firebase/*` (native modules), so it cannot run in Expo Go. You need:
1. A Firebase project with email/password + Google providers enabled.
2. `google-services.json` dropped at the repo root (Android).
3. `GoogleService-Info.plist` dropped at the repo root (iOS).
4. Three IDs pasted into `app.json`: Web Client ID, iOS Client ID, REVERSED_CLIENT_ID for `iosUrlScheme`.

Walkthrough in [`.handoff/STATE.md`](./.handoff/STATE.md) (Firebase Console Setup section).

Then:

```sh
npm install
cp .env.example .env             # fill in API base URL when backend deploys
npx expo prebuild                # generates android/ + ios/ folders, applies plugins
npx expo run:android             # native dev build, hot-reload via Metro
npx expo run:ios                 # iOS simulator (requires macOS) — for Windows users, use EAS instead
```

For shareable EAS cloud builds (no Mac required for iOS):

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

Day 2 of P1 Mid (2026-05-08) — **Phase 1: Foundation & Auth in progress**.

Done so far: repo scaffolded, GSD planning artifacts written, Supabase → Firebase migration shipped (AuthContext rewritten, Firebase + Google Sign-In + Geist + Instrument Serif installed, app.json plugin config in place), pushed to GitHub.

Blocked on: Firebase Console setup (Arham). After that lands, next up is auth UI screens (welcome/login/signup/forgot-password) and root layout wiring.

See [`.planning/STATE.md`](./.planning/STATE.md) for the live phase position.
