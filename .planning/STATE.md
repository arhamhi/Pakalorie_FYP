---
milestone: v1.1
name: P1 Final
status: in_progress
phase_current: 3
phase_total: 5
progress:
  requirements_total: 26
  requirements_done: 20
  phases_done: 2
last_updated: 2026-06-10
---

# STATE â€” Pakalorie FYP (v1.1 P1 Final)

## Current Position

Phase: **Phases 1+2 complete and live; Phase 4 (MiDaS) code-complete awaiting redeploy; Phase 3 (YOLO) awaiting one Colab run; Phase 5 docs done, device test pending.**
Plan: `.planning/ROADMAP.md`
Status: Phases 1+2 LIVE and verified at `https://api.srv987636.hstgr.cloud` (160-row seed, all endpoints, `gemini_grounded` path; calorie eval **12/12 exact, MAE 0.0** via `scripts/calorie-eval.mjs` -> `backend/docs/CALORIE_EVAL.md`, closing CALC-04). Phase 5: mobile wiring code-complete (10/10 api-smoke), SDS material written (`docs/SDS.md`), team guide written (`docs/TEAM_GUIDE.md`); on-device Expo Go smoke test + demo video still pending. Phase 4 (CDX-007): MiDaS `POST /portion` + `/calories.portion_multiplier` implemented + tested (16 pytest incl. real ONNX inference; real Haleem photo -> medium bucket) and merged; VPS redeploy (`DEPLOY.md` §4b) pending, so DEPTH-01..03 are code-done but not live. Phase 3 (CDX-006): notebook fully self-contained for any group member (`docs/TEAM_GUIDE.md` §2); only the T4 training run + MODELCARD paste remain. All work merged to `main` (PRs #2/#3/#4); working tree clean.
Last activity: 2026-06-10 - Claude built CDX-007 MiDaS end-to-end, ran the live calorie engine eval (12/12 exact), hardened the Colab notebook (Drive checkpointing + resume + error analysis + auto model-card), wrote `docs/TEAM_GUIDE.md` + `docs/SDS.md`, and cleaned git (PRs #2/#3/#4 merged).

## Accumulated Context

### Decisions (see ../.handoff/DECISIONS.md for full log)
- v1.1 = P1 Final: Food DB API + Calorie Engine/RAG + MiDaS + YOLOv8 carryover. [2026-06-03]
- Deploy on **Hostinger VPS via Docker** (always-on, no cold-start) â€” supersedes Render/Neon. [2026-06-03]
- Seed = **30 curated desi dishes + USDA augmentation** to â‰¥150. Fiber nullable, portions labeled, modifiers additive kcal. [2026-06-03]
- YOLOv8 **classification** (not detection); Gemini stays the live fallback. [2026-06-03]
- Calorie engine is **RAG-grounded** (retrieve from DB â†’ Gemini grounds answer). [per CDX-008]
- Firebase JS SDK + Expo Go (no native modules). [2026-05-19]
- Codex (backend/ML) + Claude (UI/wiring/docs) split via `.handoff/`. [2026-05-07]

### Blockers / inputs needed from Arham
- **Kaggle dataset URL(s)** for YOLOv8 (CDX-006 / Phase 3) - PROVIDED and validated. Full per-class counts are in `ml/reports/dataset_audit.md`; training is pending.
- **VPS deploy execution** (CDX-005 / Phase 1 deploy): DONE. API base URL is `https://api.srv987636.hstgr.cloud`.
- **Live-demo confirmation with Sir Hamza** (Arham answered "live demo + report + metrics"); plan accordingly.

### Pending todos
- **Arham:** VPS redeploy + `DEPLOY.md` §4b to take `/portion` live (or grant SSH); on-device Expo Go smoke test; own held-out food photos.
- **Any group member:** run the Colab training (`docs/TEAM_GUIDE.md` §2, ~90 min) and return the Drive artifacts; paste `modelcard_block.md` into `ml/MODELCARD.md`.
- **Claude (after redeploy + device test):** optionally wire `/portion` into the scan flow; backup demo video.
- ~~Claude Phase 5 wiring~~ DONE 2026-06-04. ~~CDX-007 MiDaS~~ code DONE 2026-06-10.

### Carryover from v1.0 (submitted, do not re-do)
- Auth (Firebase JS SDK / Expo Go), Capture/Results UI, Food Recognition (Gemini stub). Captureâ†’results works today via `src/lib/gemini.ts`; food logs save to Supabase. Both stay live as the fallback until the real pipeline is proven.

## Plan Reference

Master plan: `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`
PRD: `docs/PRD.md`  |  Design: `docs/DESIGN.md`
Codex queue: `../.handoff/TO_CODEX.md`  |  Repo state: `../.handoff/STATE.md`
GitHub: https://github.com/arhamhi/Pakalorie_FYP
