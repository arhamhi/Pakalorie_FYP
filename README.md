# Pakalorie — FYP

AI-powered Pakistani food recognition + calorie tracking mobile app.
SZABIST BS(AI) Final Year Project, Spring 2026 (Milestone v1.0 = P1 Mid, due end of May 2026).

## Quick links

- **Master plan:** `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`
- **Product spec:** [`docs/PRD.md`](./docs/PRD.md)
- **Design system:** [`docs/DESIGN.md`](./docs/DESIGN.md)
- **Decisions log:** [`.handoff/DECISIONS.md`](./.handoff/DECISIONS.md)
- **Roadmap:** [`.planning/ROADMAP.md`](./.planning/ROADMAP.md)
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

```sh
npm install
cp .env.example .env   # fill in Firebase + API URL
npx expo start
```

For an Android dev build:

```sh
npx eas build --profile development --platform android
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

Day 1 of P1 Mid (2026-05-07). Repo scaffolded, plan locked. See `.planning/STATE.md` for live position.
