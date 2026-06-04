---
milestone: v1.1
name: P1 Final
status: in_progress
phase_current: 1
phase_total: 5
progress:
  requirements_total: 26
  requirements_done: 0
  phases_done: 0
last_updated: 2026-06-04
---

# STATE â€” Pakalorie FYP (v1.1 P1 Final)

## Current Position

Phase: **Phase 1 - Food Database API** (implementation DONE, live API deployed, and verified against the live VPS Postgres).
Plan: `.planning/ROADMAP.md`
Status: Backend on branch `cdx/p1final-foodbackend`, **verified against a live pgvector Postgres on the VPS** (127.0.0.1-only, reached via SSH tunnel). `alembic upgrade head` succeeds; seed = `foods=160, desi_v1=30, usda=130` (idempotent); all endpoints return correct real-data responses (incl. `gemini_grounded` + `local_grounded_fallback` + both 422s). `ruff` clean; `pytest` green (9 unit + 8 live-DB integration). A Gemini thinking-token truncation bug was found + fixed. Local Docker Desktop is no longer on the critical path. CDX-005 API is live at `https://api.srv987636.hstgr.cloud`; public `/healthz` and `/foods/search?q=nihari` checks pass; n8n remains healthy; Postgres remains private. CDX-006 datasets are validated and `ml/` training scaffold exists; training is pending.
Last activity: 2026-06-04 - Codex deployed the FastAPI app behind the existing VPS Traefik proxy at `https://api.srv987636.hstgr.cloud`, verified public HTTPS health, DB-backed search, n8n health, and private Postgres. Earlier in the same branch, Codex added the production API compose/runbook and validated both Kaggle datasets for CDX-006. YOLOv8 training is still pending a Colab/GPU run plus Arham's own held-out food photos.

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
- **Claude (Phase 5):** wire `src/lib/api.ts` to `https://api.srv987636.hstgr.cloud` + update Results to show the real pipeline; keep Gemini fallback. Prepare SDS material + demo.
- **Codex (priority order):** run CDX-006 Colab `yolov8n-cls` training/eval from `ml/notebooks/train_yolov8_cls.ipynb`; CDX-007 remains last/minimal.
- **Arham:** gather own food test photos (held-out YOLO test set); keep smoke-testing Expo Go.

### Carryover from v1.0 (submitted, do not re-do)
- Auth (Firebase JS SDK / Expo Go), Capture/Results UI, Food Recognition (Gemini stub). Captureâ†’results works today via `src/lib/gemini.ts`; food logs save to Supabase. Both stay live as the fallback until the real pipeline is proven.

## Plan Reference

Master plan: `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`
PRD: `docs/PRD.md`  |  Design: `docs/DESIGN.md`
Codex queue: `../.handoff/TO_CODEX.md`  |  Repo state: `../.handoff/STATE.md`
GitHub: https://github.com/arhamhi/Pakalorie_FYP
