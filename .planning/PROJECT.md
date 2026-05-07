---
name: Pakalorie FYP
code: PKL-FYP
created: 2026-05-07
last_updated: 2026-05-08
github: https://github.com/arhamhi/Pakalorie_FYP
---

# Pakalorie — Final Year Project

## What This Is

AI-powered Pakistani food recognition and calorie tracking mobile app. SZABIST BS(AI) Final Year Project, Spring 2026. Solves the "Desi Food Gap" left by global trackers (Cal AI, MyFitnessPal) by recognizing chicken karahi, biryani, daal chawal, etc. from a phone photo and estimating calories + macros with portion + modifier adjustments.

## Core Value

Local cultural fluency. Pakistani dishes, Pakistani serving sizes, Pakistani modifier patterns (extra oil, with naan), 70/30 English/Roman Urdu UI.

## Team

- **Arham Hafeez** — technical lead, 100% of code
- **Hassan Nadeem** — documentation (Overleaf chapters, SDS, sequence diagrams)
- **Husnain Sarwar** — presentation, test cases, demo rehearsal
- **Sir Hamza Imran** — supervisor, SZABIST Islamabad

## Stack (locked)

- **Mobile:** React Native / Expo SDK 54, Expo Router, NativeWind, TanStack Query
- **Auth + user data:** Firebase Auth + Firestore
- **Food / nutrition data:** PostgreSQL behind a FastAPI service
- **Image recognition (P1 Mid):** Gemini Vision wrapper inside FastAPI (server-side)
- **Image recognition (P1 Final →):** Custom YOLOv8 detector + MiDaS depth (deferred)
- **Deployment:** Render free tier (FastAPI), Supabase / Neon free tier (Postgres), Firebase Spark
- **Fonts:** Geist Sans (UI/body) + Instrument Serif (hero numerics)

Decision rationale lives in `../.handoff/DECISIONS.md`.

## FYP Milestones (university timeline)

| Milestone | Due | Modules |
|---|---|---|
| **P1 Mid (v1.0)** | End May 2026 | Auth, Capture/Results UI, Food DB API |
| P1 Final (v1.1) | End Aug 2026 | YOLOv8 detector, hydration, Ustad coach v1 |
| P2 Mid (v1.2) | End Nov 2026 | MiDaS portion estimation, Health sync |
| P2 Final (v1.3) | End Feb 2027 | On-device inference fallback, polish, accessibility |

## Current Milestone: v1.0 P1 Mid

**Goal:** Ship a live demo on a real Android phone with Firebase auth, polished Capture + Results screens, and a deployed FastAPI + Postgres food database — all using free-tier infrastructure.

**Target features:**
- Email/password + Google sign-in (Firebase Auth)
- Camera capture + gallery upload
- Calories + 4 macros result card with confidence + alternatives
- Save result to Firestore history
- FastAPI service: `/recognize`, `/foods/search`, `/foods/{id}`, `/foods/{id}/nutrition`, `/healthz`
- PostgreSQL seeded with v1 dataset (100+ Pakistani dishes) + USDA augmentation
- Light-touch UI polish: 70/20/10 tokens, Geist + Instrument Serif, light mode only

## Active Requirements (P1 Mid)

See `REQUIREMENTS.md` for the canonical list. Summary:
- AUTH-01..07 — signup, login, Google OAuth, password reset, signout, Firestore user doc, auth-gated routing
- UI-01..10 — capture flow, results card, save, confidence/alternatives, design tokens, fonts, default accent, disclaimer
- API-01..09 — service deploy, schema, seed, 4 endpoints, server-side keys, mobile wiring
- DEMO-01..05 — EAS install, live demo flow, backup video, README, verification

## Out of Scope (this milestone)

- YOLOv8 training, dataset expansion (P1 Final)
- MiDaS depth estimation (P2 Mid)
- Google Fit / Apple HealthKit (P2 Mid)
- Ustad AI coach (P1 Final)
- Hydration tracking UI (P1 Final)
- Restaurant discovery / Google Places (P2 Final)
- Dark mode runtime switching (June UI sprint)
- Animations, micro-interactions (June UI sprint)
- iOS build (Apple Dev cert not purchased; Android-only demo)

## Key Decisions

See `../.handoff/DECISIONS.md` for full append-only log.

Highlights:
- Firebase Auth + Firestore + FastAPI + Postgres (per FYP doc compliance)
- Geist Sans + Instrument Serif (free, modern, editorial-feeling)
- Codex (backend) + Claude (UI) split via `.handoff/` files
- GSD used selectively (plan / verify only; manual execution via Claude+Codex)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Append to `.handoff/DECISIONS.md`

**After each milestone:**
1. Full review of all sections
2. Core Value check — still right?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
