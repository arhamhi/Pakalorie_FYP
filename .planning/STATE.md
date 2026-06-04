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

Phase: **Phase 1 - Food Database API** (implementation DONE and **verified against a live VPS Postgres**: migrated, seeded 160 rows, every endpoint smoke-tested, live-DB integration suite added. CDX-005 deploy config/runbook is now ready; only the actual VPS execution + public HTTPS verification remains).
Plan: `.planning/ROADMAP.md`
Status: Backend on branch `cdx/p1final-foodbackend`, **verified against a live pgvector Postgres on the VPS** (127.0.0.1-only, reached via SSH tunnel). `alembic upgrade head` succeeds; seed = `foods=160, desi_v1=30, usda=130` (idempotent); all endpoints return correct real-data responses (incl. `gemini_grounded` + `local_grounded_fallback` + both 422s). `ruff` clean; `pytest` green (9 unit + 8 live-DB integration). A Gemini thinking-token truncation bug was found + fixed. Local Docker Desktop is no longer on the critical path. CDX-005 now has `backend/docker-compose.prod.yml`, `backend/docs/DEPLOY.md`, and `backend/.dockerignore`; compose config validates locally with env resolution disabled. CDX-006 datasets are validated and `ml/` training scaffold exists; training is pending.
Last activity: 2026-06-04 - Codex added the production API compose file and VPS deploy runbook for CDX-005, then validated both Kaggle datasets for CDX-006 and added the reproducible ML scaffold. Dataset audit: merged normalized set = 218 classes, 8,660 images, 473.2 MB image bytes, 14.58x imbalance. Public HTTPS verification is still pending actual VPS execution and API subdomain confirmation. YOLOv8 training is still pending a Colab/GPU run plus Arham's own held-out food photos.

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
- **VPS deploy execution** (CDX-005 / Phase 1 deploy): confirm `api.srv987636.hstgr.cloud` or choose another API subdomain, then run `backend/docs/DEPLOY.md` on the VPS or grant Codex SSH approval. Config/runbook are ready; public HTTPS acceptance is not done.
- **Live-demo confirmation with Sir Hamza** (Arham answered "live demo + report + metrics"); plan accordingly.

### Pending todos
- **Codex (priority order):** Execute/verify CDX-005 once Arham confirms the subdomain/access; run CDX-006 Colab `yolov8n-cls` training/eval from `ml/notebooks/train_yolov8_cls.ipynb`; CDX-007 remains last/minimal.
- **Claude (Phase 5):** wire `src/lib/api.ts` to the VPS endpoints + update Results to show the real pipeline once the API is live; keep Gemini fallback. Prepare SDS material + demo.
- **Arham:** VPS deploy access + subdomain; gather own food test photos (held-out YOLO test set); keep smoke-testing Expo Go.

### Carryover from v1.0 (submitted, do not re-do)
- Auth (Firebase JS SDK / Expo Go), Capture/Results UI, Food Recognition (Gemini stub). Captureâ†’results works today via `src/lib/gemini.ts`; food logs save to Supabase. Both stay live as the fallback until the real pipeline is proven.

## Plan Reference

Master plan: `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`
PRD: `docs/PRD.md`  |  Design: `docs/DESIGN.md`
Codex queue: `../.handoff/TO_CODEX.md`  |  Repo state: `../.handoff/STATE.md`
GitHub: https://github.com/arhamhi/Pakalorie_FYP
