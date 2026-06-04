---
milestone: v1.1
name: P1 Final
created: 2026-06-03
supersedes: v1.0 (P1 Mid — submitted at midterm)
---

# Milestone v1.1 (P1 Final) Requirements

Current target: **7th-semester final, cumulative 50%, due before July 2026.** Three graded modules + the YOLOv8 carryover + the mobile-wiring/demo/docs needed for a live defense.

Categories:
- **FOODDB** — Food Database API (FastAPI + Postgres). Foundational.
- **CALC** — Calorie Calculation Engine + RAG. Showpiece.
- **YOLO** — Real YOLOv8 training (carryover, replaces the Gemini recognition stub).
- **DEPTH** — Volume & Depth Estimation (MiDaS). Minimal effort, partial marks accepted.
- **WIRE** — Mobile app wiring of the real pipeline (live demo is graded).
- **DOCS** — Report/SDS + demo deliverables.

REQ-ID format `[CATEGORY]-[NUMBER]`. Mapped to phases in `ROADMAP.md`.

---

## v1.1 Requirements

### FOODDB — Food Database API (foundational; Codex CDX-002..005)

- [ ] **FOODDB-01**: FastAPI service scaffolded (Python 3.11+, SQLAlchemy 2.0, asyncpg, Pydantic v2); `/healthz` returns 200. Local dev via `docker-compose` (Postgres 16).
- [ ] **FOODDB-02**: Postgres schema covers `foods`, `food_aliases`, `nutrition_facts`, `portion_sizes`, `modifier_constants`, migrated via Alembic. **Fiber nullable** (v1 desi data has protein/carbs/fat only). Portions are **labeled rows** (not a small/med/large enum). Modifiers are **additive kcal constants**.
- [ ] **FOODDB-03**: Seeded with the v1 desi JSON (**30 curated dishes**, preserving `name_ur`, portions, modifiers) **+ USDA FoodData Central augmentation** for breadth; `SELECT COUNT(*) FROM foods` ≥ 150. Seed script idempotent.
- [ ] **FOODDB-04**: `GET /foods/search?q=` — fuzzy match across English + Roman Urdu aliases via Postgres `pg_trgm` trigram similarity.
- [ ] **FOODDB-05**: `GET /foods/{id}` — full nutrition + all portion variants (by label) + modifier list.
- [ ] **FOODDB-06**: `POST /foods/{id}/nutrition` — accepts `{portion (label/id), modifiers[]}`, returns adjusted calories/macros via `Final = Base(portion) + Σ ModifierConstant`. Tolerates `null` fiber.
- [ ] **FOODDB-07**: `POST /recognize` — multipart image, calls Gemini Vision **server-side** (hardened: timeout, retry, error envelope), returns `{food_label, confidence, alternatives[]}`. Becomes the YOLOv8-swap point later.
- [ ] **FOODDB-08**: All Gemini API calls are server-side; **no API keys ship in the mobile bundle**.
- [ ] **FOODDB-09**: Service deployed on the **Hostinger VPS via Docker** (FastAPI container + self-hosted Postgres container, Postgres not publicly exposed), reachable from the mobile app over **HTTPS** behind the existing reverse proxy / a `pakalorie` subdomain. Always-on (no cold-start).

### CALC — Calorie Calculation Engine + RAG (showpiece; Codex CDX-008)

- [ ] **CALC-01**: Retrieval layer over the food DB returns top-k nutrition + portion + modifier rows for a recognized dish (pgvector embeddings, or `pg_trgm` if simpler). Sources are real DB rows, not model memory.
- [ ] **CALC-02**: `POST /calories` — given a recognized dish + portion (from MiDaS bucket or user), returns a structured calorie/macro breakdown **+ a short "why" explanation + the retrieved source rows**. Standard error envelope.
- [ ] **CALC-03**: Gemini composes the answer **grounded ONLY in retrieved facts** (no freelancing); reasons about portion scaling + modifiers (extra oil, with naan, extra tarri).
- [ ] **CALC-04**: Eval on a handful of known dishes (predicted vs. reference calories) producing a table for the report. Numbers sane vs. references.

### YOLO — Real YOLOv8 Training (carryover; Codex CDX-006)

- [ ] **YOLO-01**: YOLOv8 **classification** model (`yolov8n-cls` baseline, `yolov8s-cls` if needed) trained on Kaggle desi-food data on Colab free T4. Reproducible: `train_yolov8_cls.ipynb` + `prepare_dataset.py` + `train.py`/`evaluate.py`.
- [ ] **YOLO-02**: `ml/MODELCARD.md` reports **top-1 + top-5 accuracy, confusion matrix image, and sample predictions on Arham's own photos** (held-out qualitative test). Honest error analysis on weak/under-sampled classes.
- [ ] **YOLO-03**: Exported `best.pt` + `best.onnx` (or documented Drive/Release link if too large for git). `ml/README.md` explains reproduction.
- [ ] **YOLO-04** *(stretch)*: Model served behind `/recognize` on the VPS (CPU inference) as the real-recognition swap-in; otherwise documented as the on-device P2 path. Gemini fallback retained either way.

### DEPTH — Volume & Depth Estimation, MiDaS (minimal; Codex CDX-007)

- [ ] **DEPTH-01**: MiDaS monocular-depth inference server-side (`torch.hub` `intel-isl/MiDaS` small, CPU) produces a relative depth map for a food photo.
- [ ] **DEPTH-02**: Documented heuristic maps depth + plate-area → a **portion-size bucket** (small/medium/large multiplier) that the calorie engine can consume.
- [ ] **DEPTH-03**: **Limitations write-up** for the report: relative depth only, no calibrated absolute grams from one uncalibrated phone photo. No faked accuracy.

### WIRE — Mobile Pipeline Wiring (live demo is graded)

- [ ] **WIRE-01**: `src/lib/api.ts` typed client wired to the deployed VPS endpoints (`/recognize`, `/foods/search`, `/foods/{id}`, `/foods/{id}/nutrition`, `/calories`).
- [ ] **WIRE-02**: Results screen shows the **real pipeline output** (recognition → portion → grounded calorie/macro breakdown + the "why" + sources), not the client-side Gemini shortcut.
- [ ] **WIRE-03**: **Gemini retained as fallback** when the pipeline/endpoint is unavailable; degradation is graceful and visible (no silent fake numbers).
- [ ] **WIRE-04**: End-to-end **live demo on device**: snap a Pakistani dish in Expo Go → real result in a sane time. No cold-start (VPS always-on).

### DOCS — Report & Demo Deliverables

- [ ] **DOCS-01**: SDS support material for Hassan/Husnain: architecture diagram of the pipeline, API contract (auto-generated OpenAPI), RAG methodology write-up, YOLOv8 + MiDaS results tables.
- [ ] **DOCS-02**: Backup demo video of the full pipeline recorded and stored locally + on Drive (insurance against live-demo network issues).

---

## Submitted (v1.0 P1 Mid — archived, do not re-do)

| Module | Requirements (v1.0) | Status |
|---|---|---|
| Authentication | AUTH-01..07 | ✅ Submitted (Firebase JS SDK / Expo Go; Google OAuth build-only) |
| Core Mobile UI (Capture/Results) | UI-01..10 | ✅ Submitted (70/20/10 tokens, Geist + Instrument Serif, Phosphor) |
| Food Recognition (YOLOv8) | — | ✅ Submitted as a Gemini-Vision stub; real training carried over as YOLO-01..04 |

Full v1.0 requirement text is preserved in git history (this file's prior revision) and the ROADMAP archive note.

---

## Future Requirements (P2, 8th sem — deferred)

- **P2 Mid (v1.2):** Model Optimization & Quantization; Data Viz + Calorie Compensation; Real-Time / on-device Inference Pipeline.
- **P2 Final (v1.3):** Urdu Localization; Health Data Sync (Google Fit / Apple HealthKit); AI Chat Coach (Ustad).
- YOLOv8 **detection** (bounding boxes, multi-dish) — gated on building a labeled detection set (Roboflow/CVAT).
- Calibrated absolute-gram portion estimation — needs a fiducial/reference-object pipeline.

---

## Out of Scope (explicit exclusions for v1.1)

| Excluded | Reason |
|---|---|
| YOLOv8 detection / bounding boxes | No labeling pipeline; classification only this milestone |
| Calibrated absolute grams (MiDaS) | Unreliable from one uncalibrated photo; deliver relative depth + bucket + documented limitation |
| On-device / real-time inference | P2 Mid module (Real-Time Inference Pipeline) |
| Render / managed Postgres | Replaced by Hostinger VPS Docker (no cold-start) |
| Firestore migration of food logs (CDX-001) | Optional cleanup; Supabase logging stays unless time allows |
| Dark mode, animations, accent picker | Deferred UI polish |
| Re-doing P1 Mid auth/UI | Already submitted |

---

## Traceability

Filled by `ROADMAP.md` — every REQ-ID maps to exactly one phase.
