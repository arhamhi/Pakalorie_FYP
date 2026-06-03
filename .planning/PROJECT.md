---
name: Pakalorie FYP
code: PKL-FYP
created: 2026-05-07
last_updated: 2026-06-03
github: https://github.com/arhamhi/Pakalorie_FYP
---

# Pakalorie — Final Year Project

## What This Is

AI-powered Pakistani food recognition and calorie tracking mobile app. SZABIST BS(AI) Final Year Project. Solves the "Desi Food Gap" left by global trackers (Cal AI, MyFitnessPal) by recognizing chicken karahi, biryani, daal chawal, etc. from a phone photo and estimating calories + macros with portion + modifier adjustments.

## Core Value

Local cultural fluency. Pakistani dishes, Pakistani serving sizes, Pakistani modifier patterns (extra tarri, nalli, with naan), 70/30 English/Roman Urdu UI.

## Team

- **Arham Hafeez** — technical lead, 100% of code
- **Hassan Nadeem** — documentation (Overleaf chapters, SDS, sequence diagrams)
- **Husnain Sarwar** — presentation, test cases, demo rehearsal
- **Sir Hamza Imran** — supervisor, SZABIST Islamabad

## Stack (locked)

- **Mobile:** React Native / Expo SDK 54, Expo Router, NativeWind, TanStack Query. Runs in **Expo Go** (Firebase JS SDK + `expo-auth-session`, no native modules).
- **Auth + user data:** Firebase Auth + Firestore.
- **Food / nutrition data:** PostgreSQL behind a FastAPI service.
- **Image recognition:** YOLOv8 classification model (P1 Final carryover) trained on Kaggle desi-food data; **Gemini Vision stays the live fallback** until the model is proven and served.
- **Portion / volume:** MiDaS monocular depth (P1 Final, deliberately minimal — relative depth + portion bucket, documented limitation).
- **Calorie engine:** retrieval over the food DB (pgvector / pg_trgm) + Gemini generating a calorie/macro breakdown grounded only in retrieved facts (RAG).
- **Deployment:** **Hostinger KVM 2 VPS** (`179.61.246.154`, Ubuntu 24.04, Docker) — FastAPI + self-hosted Postgres in containers alongside existing n8n. Firebase Spark. YOLOv8 training on Colab free T4.
- **Fonts:** Geist Sans (UI/body) + Instrument Serif (hero numerics).

Decision rationale lives in `../.handoff/DECISIONS.md`.

## FYP Milestones (12 modules / 4 milestones / 25% each)

| Milestone | Status | Modules (3 each) |
|---|---|---|
| **P1 Mid (v1.0)** | ✅ SUBMITTED (7th-sem midterm, 25%) | Authentication, Core Mobile UI (Capture/Results), Food Recognition (YOLOv8 — shipped as a Gemini-Vision stub) |
| **P1 Final (v1.1)** | 🔴 CURRENT TARGET (7th-sem final, cumulative 50%, due before July 2026) | Food Database API, Volume & Depth Estimation (MiDaS), Calorie Calculation Engine + RAG. **Carryover:** real YOLOv8 training. |
| P2 Mid (v1.2) | Later (8th sem) | Model Optimization & Quantization, Data Viz + Calorie Compensation, Real-Time Inference Pipeline |
| P2 Final (v1.3) | Later (8th sem) | Urdu Localization, Health Data Sync, AI Chat Coach |

Full mapping + rationale: `../.handoff/DECISIONS.md` (2026-06-03, "Milestone map corrected").

## Current Milestone: v1.1 P1 Final

**Goal:** Build the real connected pipeline — `photo → YOLOv8 (dish) → Food DB API (nutrition lookup) → MiDaS (rough portion) → Calorie Engine + RAG (grounded calorie/macro)` — replacing the P1-Mid Gemini-does-everything shortcut. Deliver 3 graded modules + the YOLOv8 carryover, deployed on the VPS, with a working live device demo and report-ready metrics. Free-tier / already-paid infra only.

**The pipeline (one connected system):**
```
photo → YOLOv8 classification (dish label)
      → Food DB API (nutrition + portions + modifiers lookup)
      → MiDaS (relative depth → portion bucket)
      → Calorie Engine + RAG (retrieve facts → Gemini grounds calorie/macro + "why")
      → Results screen (real output; Gemini fallback if pipeline down)
```

**Build order (dependency-driven):**
1. **Food Database API** — foundational; the calorie engine reads from it. (Codex CDX-002→005.)
2. **Calorie Engine + RAG** — the showpiece; depends on the seeded DB. (Codex CDX-008.)
3. **YOLOv8 training** — carryover; parallel, independent of the API. (Codex CDX-006.)
4. **MiDaS** — minimal, last. (Codex CDX-007.)
5. **Mobile wiring + demo + docs** — Claude wires `src/lib/api.ts`, updates Results, prepares the live demo + SDS chapters.

## Submitted (P1 Mid, v1.0 — do not re-do)

- **Authentication** — Firebase Auth (JS SDK) + Firestore profile, email/password through Expo Go; Google OAuth code-wired (build-only).
- **Core Mobile UI** — Capture + Results screens on the 70/20/10 token system, Geist + Instrument Serif, Phosphor icons.
- **Food Recognition** — YOLOv8 deliverable shipped as a Gemini-Vision stub (per the original "Gemini now, YOLOv8 later" call). Real training is the v1.1 carryover.

Capture→results works end-to-end today via Gemini Vision (`src/lib/gemini.ts`); food logs save to Supabase. Both kept live as the fallback until the real pipeline is proven.

## Out of Scope (this milestone)

- YOLOv8 **detection** (bounding boxes) — needs a labeling pipeline; classification only for now. (P2.)
- Calibrated absolute grams from a single uncalibrated photo — MiDaS gives relative depth + a portion bucket, with the limitation documented. (Honest scope.)
- On-device / real-time inference — that's a P2 Mid module (Real-Time Inference Pipeline).
- Model quantization, Data Viz + Calorie Compensation, Urdu Localization, Health Data Sync, AI Chat Coach — all P2.
- Firestore migration of food logs (CDX-001) — optional cleanup; Supabase logging stays unless time allows.
- Dark mode, animations, accent picker — deferred UI polish.

## Key Decisions

See `../.handoff/DECISIONS.md` for the full append-only log. Highlights relevant to v1.1:
- Deploy on the **Hostinger VPS via Docker**, not Render (no cold-starts → reliable live demo). [2026-06-03]
- Food DB seed = **30 curated desi dishes + USDA augmentation** to ≥150; macros have no fiber, portions are labeled not small/med/large, modifiers are additive kcal. [2026-06-03]
- YOLOv8 **classification** (not detection); Gemini stays the live app path until the model is served. [2026-06-03]
- Calorie engine is **RAG-grounded** (retrieve from DB → Gemini grounds the answer), not a hardcoded formula and not unguided Gemini. [per CDX-008]
- Firebase JS SDK + Expo Go (no native modules) to keep `npx expo start` → QR working. [2026-05-19]
- Codex (backend/ML) + Claude (UI/wiring/docs) split via `.handoff/`. [2026-05-07]

## Evolution

This document evolves at phase transitions and milestone boundaries. After each phase: invalidated requirements → Out of Scope with reason; validated → mark done with phase ref; new → add to Active; decisions → append to `../.handoff/DECISIONS.md`.
