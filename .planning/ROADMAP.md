---
milestone: v1.1
name: P1 Final
created: 2026-06-03
last_updated: 2026-06-03
total_phases: 5
total_requirements: 26
coverage: 100%
supersedes: v1.0 (P1 Mid — submitted)
---

# Milestone v1.1 (P1 Final) Roadmap

**5 phases** | **26 requirements mapped** | All covered ✓
Target: 7th-sem final, cumulative 50%, due before July 2026. Live demo + report + metrics.

Build order is **dependency-driven**, not calendar-driven: the Food DB is foundational (the calorie engine reads it), the calorie engine is the showpiece, YOLOv8 runs in parallel, MiDaS is last and minimal, then the mobile wiring + demo + docs close it out.

| # | Phase | Goal | Requirements | Owner | Success Criteria |
|---|---|---|---|---|---|
| 1 | Food Database API | FastAPI + Postgres deployed on the VPS, seeded ≥150, 5 endpoints live | FOODDB-01..09 | Codex (CDX-002..005) | 5 |
| 2 | Calorie Engine + RAG | Retrieve from DB → Gemini grounds calorie/macro + "why" + sources | CALC-01..04 | Codex (CDX-008) | 4 |
| 3 | YOLOv8 Training | Real classification model + honest metrics (parallel) | YOLO-01..04 | Codex (CDX-006) | 4 |
| 4 | MiDaS Depth (minimal) | Relative depth → portion bucket + limitations note | DEPTH-01..03 | Codex (CDX-007) | 3 |
| 5 | Wiring, Demo & Docs | Mobile calls the real pipeline; live demo + SDS material | WIRE-01..04, DOCS-01..02 | Claude | 5 |

---

## Phase Details

### Phase 1: Food Database API (foundational — START HERE)

**Goal:** A FastAPI service backed by self-hosted Postgres on the Hostinger VPS, seeded with the 30 desi dishes + USDA augmentation (≥150), exposing the food/nutrition endpoints. Everything downstream reads from this.

**Requirements:** FOODDB-01..09
**Codex:** CDX-002 (scaffold) → CDX-003 (schema + seed) → CDX-004 (endpoints) → CDX-005 (VPS Docker deploy).

**Success criteria:**
1. `docker-compose up` runs FastAPI + Postgres locally; `curl localhost:8000/healthz` → 200.
2. Alembic schema covers all 5 tables; fiber nullable; portions labeled; modifiers additive. `SELECT COUNT(*) FROM foods` ≥ 150 after seed (30 desi + USDA).
3. `/foods/search` (pg_trgm, EN + Roman Urdu), `/foods/{id}`, `/foods/{id}/nutrition` (portion + modifier math), `/recognize` (server-side Gemini) all documented in OpenAPI.
4. No Gemini key in the mobile bundle (server-side only).
5. Deployed on the VPS over HTTPS behind the reverse proxy, always-on, reachable from the app.

### Phase 2: Calorie Engine + RAG (showpiece)

**Goal:** Turn a recognized dish + portion into a grounded calorie/macro breakdown by retrieving real nutrition rows and having Gemini compose the answer constrained to those rows.

**Requirements:** CALC-01..04
**Codex:** CDX-008. **Depends on:** Phase 1 seeded DB (CDX-003).

**Success criteria:**
1. Retrieval layer (pgvector or pg_trgm) returns top-k nutrition + portion + modifier rows for a dish.
2. `POST /calories` returns structured macros + a "why" + the retrieved source rows (standard envelope).
3. Gemini is grounded only in retrieved facts; portion scaling + modifiers handled correctly.
4. Eval table (predicted vs reference kcal) on a known-dish set; numbers sane.

### Phase 3: YOLOv8 Training (carryover — runs in parallel)

**Goal:** Replace the Gemini recognition stub with a real, reportable classification model. Independent of the API, so it can run alongside Phases 1–2.

**Requirements:** YOLO-01..04
**Codex:** CDX-006. **Blocked on:** Arham providing Kaggle dataset URL(s).

**Success criteria:**
1. Colab notebook trains `yolov8*-cls` on the Kaggle desi-food data end-to-end on free T4.
2. `ml/MODELCARD.md`: top-1/top-5, confusion matrix, sample predictions on Arham's photos, honest error analysis.
3. `best.pt` + `best.onnx` exported; reproduction documented.
4. *(stretch)* served behind `/recognize` on the VPS, or documented as the P2 on-device path.

### Phase 4: MiDaS Depth (minimal — last)

**Goal:** A pretrained depth pass that yields a portion bucket, with the limitation stated plainly. Deliberately small; partial marks accepted.

**Requirements:** DEPTH-01..03
**Codex:** CDX-007.

**Success criteria:**
1. MiDaS small (CPU) returns a relative depth map for a food photo on the VPS.
2. Heuristic depth + plate-area → portion bucket (small/med/large multiplier) the calorie engine consumes.
3. Limitations write-up: relative only, no calibrated grams. No faked accuracy.

### Phase 5: Wiring, Demo & Docs (Claude)

**Goal:** Make the app show the real pipeline, rehearse a reliable live demo, and hand Hassan/Husnain the report material.

**Requirements:** WIRE-01..04, DOCS-01..02
**Owner:** Claude. **Depends on:** Phases 1–2 deployed (3–4 feed in as they land).

**Success criteria:**
1. `src/lib/api.ts` wired to the VPS endpoints (typed).
2. Results screen shows real recognition → portion → grounded calorie breakdown + "why" + sources.
3. Gemini fallback kicks in gracefully when the pipeline is down; no silent fake numbers.
4. Live end-to-end demo on device (Expo Go) in a sane time; backup video recorded.
5. SDS material delivered: architecture diagram, OpenAPI contract, RAG methodology, YOLOv8 + MiDaS results tables.

---

## Coverage Validation

Every REQ-ID in `REQUIREMENTS.md` maps to exactly one phase:
- Phase 1: FOODDB-01..09 (9)
- Phase 2: CALC-01..04 (4)
- Phase 3: YOLO-01..04 (4)
- Phase 4: DEPTH-01..03 (3)
- Phase 5: WIRE-01..04, DOCS-01..02 (6)

**Total: 26 mapped REQ-IDs across the 6 categories. 100% coverage of v1.1 active requirements.**

---

## Archive: v1.0 (P1 Mid) — SUBMITTED

The prior milestone shipped 4 phases / 33 requirements (AUTH-01..07, UI-01..10, API-01..09, DEMO-01..07): Foundation & Auth, Capture/Results UI Polish, FastAPI scaffold groundwork, Demo & Acceptance. Submitted at the 7th-sem midterm (25%). Food Recognition shipped as a Gemini stub; real YOLOv8 training is carried into v1.1 as Phase 3. Full v1.0 text is in this file's git history.

## Numbering note

Phases reset to **1** for v1.1 since v1.0 is closed/submitted and these docs are a clean re-baseline. v1.0's phases (1–4) are archived above.
