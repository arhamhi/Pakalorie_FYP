# TO_CODEX — task queue for Codex CLI

Codex's lane: **backend (FastAPI + PostgreSQL), Firestore migration, infra, ML/dataset prep + model training**.
Read `STATE.md` first. After each session, update `STATE.md`, append to `DECISIONS.md`, and write your reply in `TO_CLAUDE.md`.

---

## 2026-06-10 (Claude) — CDX-007 is DONE (Arham-authorized lane crossover); contract addition on /calories

Arham asked Claude to close out P1 Final, including MiDaS. **CDX-007 is implemented, tested, and merged to `main` (PR #4)** — do not re-implement. `POST /portion` (MiDaS v2.1 small ONNX, CPU) returns `{bucket, multiplier, depth_stats, why, limitations, model_used}`; methodology + limitations in `backend/docs/DEPTH_NOTES.md`.

**Contract change you should know about (additive, backward-compatible):** `POST /calories` now accepts optional `portion_multiplier` (float, 0 < x <= 3) and the response gained `applied_portion_multiplier: float | null`. Scaling happens deterministically after grounding; `source_rows` stay unscaled. `API_CONTRACT.md` is updated. `scripts/api-smoke.mjs` is untouched (no shape it checks changed); `scripts/calorie-eval.mjs` (new) proved 12/12 exact on the live API.

**Deploy note:** the live VPS does NOT have `/portion` yet — next `git pull` + rebuild + `DEPLOY.md` §4b (one-time model download into the host-mounted `backend/models/`; api `mem_limit` bumped 768m -> 1g in `docker-compose.prod.yml`). Arham executes or grants SSH.

**CDX-006:** the Colab notebook is now fully self-contained for any group member (Drive checkpointing + resume, full 218-class baseline, error analysis, auto MODELCARD block — see `docs/TEAM_GUIDE.md` §2). The T4 run itself is the only remaining step; if you run it, follow the notebook as-is and paste the generated block into `ml/MODELCARD.md`.

---

## 2026-06-04 (Claude) — heads up: the mobile app now consumes the live API contract

Phase 5 wiring is done. `src/lib/api.ts` (new) is typed directly against `backend/docs/API_CONTRACT.md` and the live responses from `https://api.srv987636.hstgr.cloud`. The scan flow now calls `POST /recognize` then `POST /calories` and maps the exact response shapes (envelope `{success,data,error}`; `/recognize` -> `{food_label,confidence,alternatives:[{food_label,confidence}]}`; `/calories` -> `{food_id,food_label,portion_label,calories_kcal,protein_g,carbs_g,fat_g,fiber_g,applied_modifiers,ignored_modifiers,why,model_used,source_rows}`). Desi `fiber_g: null` is relied on (UI shows a dash).

**If you change any of these response field names/shapes or the error envelope, say so in `TO_CLAUDE.md` so the client + `scripts/api-smoke.mjs` get updated in lockstep.** The client tolerates `model_used` being either `gemini_grounded` or `local_grounded_fallback`, so toggling the server key does not break it. No Gemini key is sent from the client; recognition stays server-side. CDX-006 (YOLO) does NOT need mobile changes yet — Gemini-server recognition remains the live `/recognize` path.

---

## ⚠️ 2026-06-03 scope — CURRENT TARGET IS P1 FINAL (7th-sem final, cumulative 50%, due before July)

FYP = 12 modules / 4 milestones / 25% each. **P1 Mid (Auth + UI + YOLOv8-as-Gemini-stub) was SUBMITTED at midterm = 25%.** Current target = **P1 Final** (next 25%, cumulative 50%). Full mapping in `DECISIONS.md` (2026-06-03, "Milestone map corrected").

**P1 Final = 3 graded modules + 1 carryover. ALL ACTIVE. Priority order:**
1. **Food Database API** (CDX-002 → CDX-003 → CDX-004 → CDX-005) — foundational; the calorie engine reads from it. **START HERE.**
2. **Calorie Calculation Engine + RAG** (CDX-008) — the showpiece. Depends on the food DB being seeded (CDX-003).
3. **YOLOv8 real training** (CDX-006) — carryover; replaces the Gemini recognition stub. Can run in parallel (independent of the API).
4. **MiDaS Volume & Depth** (CDX-007) — minimal effort, accept partial marks.

- **CDX-001 (Firestore log migration):** optional cleanup; do only if time allows.

**Changed 2026-06-03 (read before starting — full rationale in `DECISIONS.md`):**
- **Deploy = Hostinger VPS via Docker, NOT Render.** Always-on (live demo is graded). See CDX-005. Postgres self-hosted in a container on the same box.
- **Seed reality = 30 desi dishes (not "100+") + USDA augmentation to ≥150.** Exact v1 JSON schema + fiber/portion/modifier rules in CDX-003. Use a **pgvector** Postgres image (CDX-002) for CDX-008's RAG.
- **Live demo is required** for the P1 Final defense → the app must call the real pipeline end-to-end (Claude's Phase 5).
- **Still blocked:** CDX-006 training needs a Colab/GPU run and Arham's own held-out food photos. CDX-005 deploy is done and live.

---

## Active queue

### Current Codex status - 2026-06-03

**UPDATED 2026-06-03 (Claude): CDX-002/003/004/008 are DONE and verified against a live Postgres.** Claude stood up a seeded pgvector Postgres on the VPS (bound to `127.0.0.1` only, isolated network/volume, n8n unaffected), ran `alembic upgrade head`, seeded `foods=160, desi_v1=30, usda=130` (idempotent), and smoke-tested every endpoint against real data, including the `gemini_grounded` and `local_grounded_fallback` paths and both 422 cases. A live-DB integration suite was added (`backend/tests/test_integration.py`); `ruff` clean, `pytest` green (9 unit + 8 integration). A real bug was fixed along the way: `gemini-3-flash-preview` thinking tokens were truncating the JSON (now `responseMimeType=application/json` + `thinkingBudget=0` in `app/services/gemini.py`). The `per_g` column was renamed to `portion_weight_g`. Full details in `STATE.md` + `DECISIONS.md` (2026-06-03). **Do not restart the scaffold or re-run the DB smoke — it is proven.** The only remaining Food-DB-API work is **CDX-005**, now narrowed to the app tier + proxy (see below). Claude-facing endpoint shapes are in `backend/docs/API_CONTRACT.md`; data-source framing in `backend/docs/DATA_NOTES.md`. Still open: real-desi-photo recognition accuracy (validate on-device, Phase 5).

### CDX-006 — YOLOv8 classification model for Pakistani food (ACTIVE, P1 Mid) 🔴
**Goal:** Train and evaluate a YOLOv8 **classification** model (`yolov8n-cls` / `yolov8s-cls`) on the Kaggle desi-food datasets. Deliver as a Colab notebook + weights + metrics. Do NOT wire it into the mobile app (Gemini stays the live path for P1 Mid — see `DECISIONS.md` 2026-06-03).

**Why classification, not detection:** Kaggle datasets are folder-per-dish classification sets with no bounding boxes, and there is no time/pipeline to label detection boxes before end of June. Classification trains directly on the folders. (Full rationale in `DECISIONS.md`.)

**Inputs (Arham to provide / confirm in `TO_CLAUDE.md`):**
- Kaggle dataset name(s)/URL(s) the partner found ("desi food" datasets). Codex inspects them and reports: class list, per-class image counts, total size, and any class imbalance.
  - **PROVIDED 2026-06-03 by Arham:**
    1. https://www.kaggle.com/datasets/izbaiman/food-images
    2. https://www.kaggle.com/datasets/useractivated/dataset
  - Codex: validate BOTH before training. The 2nd has a generic name (`useractivated/dataset`) so confirm it is actually desi-food classification folders (and not something unrelated). Report the merged class list, per-class image counts, total size, and any class imbalance in `TO_CLAUDE.md` before kicking off `yolov8*-cls` training.
  - **VALIDATED 2026-06-04 by Codex:** Kaggle metadata and local download confirm `useractivated/dataset` is the Pakistani Dishes Dataset (14 classes, 100 images/class), not an unrelated generic dataset. Audit outputs are committed under `ml/reports/`. Summary: `izbaiman/food-images` = 210 raw folders, 208 normalized classes, 7,260 images, 390.1 MB local image bytes, 12-75 images/class; `useractivated/dataset` = 14 raw folders/classes, 1,400 images, 83.1 MB local image bytes, 100/class; merged normalized set = 218 classes, 8,660 images, 473.2 MB image bytes, 12-175 images/class, 14.58x imbalance. Training has not been run yet.
- A handful of Arham's own food photos → use as a held-out qualitative TEST set (ground truth known; zero labeling).

**Deliverables (new top-level `ml/` folder):**
- `ml/notebooks/train_yolov8_cls.ipynb` — Colab-ready: installs `ultralytics`, downloads/mounts the dataset (Kaggle API or Drive), arranges into `train/`+`val/` class folders, trains, evaluates, exports. Free-tier T4 GPU, runnable end-to-end.
- `ml/scripts/prepare_dataset.py` — reproducible: dedupe, resize to 224, train/val split (e.g. 80/20, stratified), emit the `ultralytics`-expected directory layout. Idempotent.
- `ml/scripts/train.py` + `ml/scripts/evaluate.py` — CLI equivalents of the notebook for reproducibility off Colab.
- `ml/models/` — exported `best.pt` + `best.onnx` (or document where weights live if too large for git; prefer Drive/Releases link + a small `MODELCARD.md`).
- `ml/MODELCARD.md` — dataset description, class list, train/val split, hyperparameters, **top-1 + top-5 accuracy, confusion matrix image, sample predictions on Arham's own photos.** This table feeds Hassan's report chapter directly.
- `ml/README.md` — how to reproduce: open notebook → run all → read metrics.

**Approach notes:**
- Start `yolov8n-cls.pt` (fast baseline), then try `yolov8s-cls.pt` if accuracy is weak. `imgsz=224`, `epochs=50` as a starting point; tune on the val curve.
- Report honest numbers. If a class is weak/under-sampled, say so in the model card — supervisors value an honest error analysis over inflated accuracy.
- Keep everything free-tier: Colab free T4, Kaggle public datasets, no paid compute.

**Acceptance:** Notebook runs top-to-bottom on Colab free tier and produces a metrics table + confusion matrix; `MODELCARD.md` is complete; Claude reviews and approves in `TO_CLAUDE.md`. Bounding-box detection is explicitly OUT of scope (P1 Final).

---

## P1 Final queue (ACTIVE — Food DB API is foundational, start with CDX-002)

### CDX-001 — Firestore migration plan (Week 1, Day 6-7)
**Goal:** Map v2's remaining Supabase tables to Firestore collections. Don't write code yet — produce a migration spec.

**Note (2026-05-08):** Profile (the `users/{uid}` doc) has already been migrated by Claude in Day 2's AuthContext rewrite. Source of truth for the new Profile shape is `src/types/profile.ts`. CDX-001 covers the OTHER collections only.

Deliverable: `backend/docs/firestore-schema.md` covering:
- Collection structure for: `food_logs`, `hydration_logs`, `favorites`, `chat_sessions`, `weight_logs`. (Skip `profiles` — already done.)
- Firestore security rules (per-user access via `request.auth.uid`).
- Indexes needed (composite on `user_id + created_at` for log queries).
- Data shape decisions (subcollections under `users/{uid}/...` vs. flat collections + `userId` field) — recommend subcollections by default; document the trade-off.
- Migration script outline (no code yet) for moving any existing v2 Supabase data into Firestore on first sign-in (or accept a clean break — Claude to decide).

Source schema: see `src/lib/supabase.ts` and `src/types/database.ts`. Also reference `Pakalorie_v2/TRD_Pakalorie.md` §3 for original column-level intent.

Acceptance: Claude approves the spec in `TO_CLAUDE.md`, then Codex writes the rules + indexes (separate task CDX-001b).

---

### CDX-002 — FastAPI scaffold (Week 2, starts ~May 15)
**Goal:** Create `backend/` folder with FastAPI service skeleton.

- Python 3.11+, `pyproject.toml` (uv or poetry — pick one, document in `DECISIONS.md`).
- Dependencies: `fastapi`, `uvicorn`, `sqlalchemy>=2.0`, `asyncpg`, `pydantic>=2`, `python-multipart`, `httpx` (for Gemini), `google-generativeai`.
- Folder layout: `backend/app/{main.py,api/,db/,schemas/,services/}`.
- `/healthz` endpoint returning `{"status":"ok"}`.
- Local Postgres via `docker-compose.yml` for dev — use a **pgvector-enabled Postgres 16 image** (e.g. `pgvector/pgvector:pg16`) so CDX-008's RAG retrieval works on the same DB. Enable `pg_trgm` + `vector` extensions in the baseline migration.
- `.env.example` documenting required vars: `DATABASE_URL`, `GEMINI_API_KEY`, `CORS_ORIGINS`.

Acceptance: `uvicorn app.main:app --reload` runs locally, `curl localhost:8000/healthz` returns 200.

---

### CDX-003 — PostgreSQL schema + seed (Week 2)
**Goal:** Schema for `foods`, `food_aliases`, `nutrition_facts`, `portion_sizes`, `modifier_constants`. Seed from the v1 desi dataset + USDA augmentation.

Source for seed data: `C:\Users\Arham\OneDrive\Desktop\AI Work\Pakalorie\pakalorie_food_database.json`.

**⚠️ Seed reality (verified 2026-06-03 — the earlier "100+ dishes" was wrong):**
- The v1 JSON has **exactly 30 dishes**, not 100+. Treat them as the curated **desi core**; clear the ≥150 target with **USDA FoodData Central** augmentation. (Decision logged in `DECISIONS.md` 2026-06-03.)
- **Exact v1 schema** (design the tables to fit this, lossless):
  ```jsonc
  // top level: { "version": ..., "last_updated": ..., "dishes": [ ... ] }
  {
    "id": "meat_01",
    "name_en": "Nihari (Beef/Mutton)",
    "name_ur": "نہاری",
    "category": "Meat Gravy",
    "base_unit": "grams",
    "portions": [ { "label": "Standard Bowl", "weight": 300, "kcal": 255, "p": 38, "c": 4, "f": 17 } ],
    "modifiers": { "extra_tarri": 60, "nalli": 45 }   // additive kcal constants, per dish
  }
  ```
- **Macros are protein/carbs/fat only — NO fiber.** Make `fiber` **nullable** in `nutrition_facts`. USDA rows carry fiber; desi rows leave it null. The mobile Results screen shows a fiber card — it must tolerate `null` (don't fabricate fiber).
- **Portions are labeled rows** (e.g. "Standard Bowl", grams in `weight`), often a single portion per dish. Do **NOT** model portions as a hardcoded small/medium/large enum — store the labels from the data and key `/foods/{id}/nutrition` on portion label/id.
- **Modifiers are additive kcal constants** keyed by name (`extra_tarri: 60`). No per-modifier macro deltas in v1. The formula reduces to `Final_kcal = portion.kcal + Σ modifier_kcal`; macros scale with the chosen portion's weight. Persist modifiers in `modifier_constants` (FK to food).
- Preserve `name_ur` (Urdu script) and `name_en`; seed both into `food_aliases` for search (plus Roman-Urdu aliases where you can derive them).

- SQLAlchemy 2.0 models with `Mapped[]` syntax.
- Alembic migrations (`alembic init`, baseline migration committed).
- Seed script `backend/scripts/seed_foods.py` — idempotent (re-runnable without duplicates; upsert on a stable natural key like the desi `id` / USDA fdc_id).
- Augment with USDA FoodData Central public dump for global items (download from https://fdc.nal.usda.gov/download-datasets). Tag row provenance (`source: 'desi_v1' | 'usda'`) so the report can separate the curated core from the breadth import.

Acceptance: `alembic upgrade head && python -m scripts.seed_foods` populates the DB. `SELECT COUNT(*) FROM foods` returns ≥150 rows; all 30 desi dishes present with `name_ur`, portions, and modifiers intact; `SELECT count(*) FROM foods WHERE source='desi_v1'` = 30.

---

### CDX-004 — API endpoints (Week 3)
**Goal:** Implement the 4 P1 Mid endpoints.

1. `POST /recognize` — accepts multipart image, calls Gemini Vision (server-side), returns `{food_label, confidence, alternatives[]}`. Reuse logic from `src/lib/gemini.ts` but harden it (timeout, retry, error envelope).
2. `GET /foods/search?q=` — fuzzy search by name (English + Roman Urdu aliases). Use Postgres `pg_trgm` extension for trigram similarity.
3. `GET /foods/{id}` — full nutrition + portion variants.
4. `POST /foods/{id}/nutrition` — accepts `{portion: <label or id from that food's portions>, modifiers: [<modifier names from that food>]}`, returns adjusted calorie/macro. **Portion is NOT a fixed small/medium/large enum** — the v1 data has labeled portions (e.g. "Standard Bowl") that vary per dish; validate the portion against the food's own portion rows. Formula reduces to `Final_kcal = portion.kcal + Σ modifier_kcal`; macros come from the chosen portion (fiber may be `null` for desi rows). See the schema notes in CDX-003.

Validation: Pydantic v2 schemas, consistent error envelope `{success: bool, data: T|null, error: string|null}`.

Acceptance: All 4 endpoints documented in OpenAPI (auto-generated). Claude wires `src/lib/api.ts` to them in mobile app.

---

### CDX-005 — VPS Docker deploy (was Render — CHANGED 2026-06-03)
**DONE 2026-06-04 by Codex:** API is live at `https://api.srv987636.hstgr.cloud`. Public `/healthz` returns HTTP 200 `{"status":"ok"}`; public `/foods/search?q=nihari` returns live DB results; `pakalorie-api` is healthy, attached to `root_default` + `pakalorie_net`, and publishes no host port; n8n remains HTTP 200; Postgres remains private (`TcpTestSucceeded=False` externally on port 5432). Claude can wire mobile to the live API base URL.

**RESCOPED 2026-06-03 (Claude) — the Postgres half is already DONE.** A seeded pgvector Postgres (`pakalorie-postgres`) is live on the VPS: `pgvector/pgvector:pg16`, its own Docker network (`pakalorie_net`) + named volume (`pakalorie_pgdata`), **published only on `127.0.0.1:5432`** (not public), `--restart unless-stopped`, strong password in the on-box env. It is migrated, seeded (160 rows), and fully verified. n8n + Traefik are unaffected. **Codex's remaining job is only the app tier + proxy:**
1. Containerize the FastAPI app (the `Dockerfile` exists; `docker-compose.yml`'s `api` service already runs `alembic upgrade head` before uvicorn — adapt it into a prod compose or run alongside the existing container).
2. Attach the app to the **existing** Postgres container's private network (`--network pakalorie_net`) and point `DATABASE_URL` at the internal Docker hostname `pakalorie-postgres:5432` (NOT `localhost`/the tunnel — that is laptop-only).
3. Expose the app behind the **existing Traefik** reverse proxy (confirmed running as `root-traefik-1`, ports 80/443) with a chosen API subdomain + HTTPS (Let's Encrypt via Traefik labels). Do NOT stand up a second proxy, and do NOT publish Postgres.
4. Seeding is already done; do not re-seed unless the volume is wiped.

The original full-deploy plan below stays as reference for the app-tier + proxy + `DEPLOY.md` steps; ignore its "stand up Postgres" parts (done).

**Goal (original):** Deploy FastAPI + Postgres as Docker containers on Arham's **Hostinger KVM 2 VPS**. (Supersedes the old Render free-tier plan — decision logged in `DECISIONS.md` 2026-06-03. Reason: live demo is graded; Render free cold-starts after 15min idle would break it. The VPS is always-on.)

**VPS facts:** Ubuntu 24.04, 2 vCPU / 8 GB RAM / 100 GB disk (≈91 GB free), root, IP `179.61.246.154`, host `srv987636.hstgr.cloud`, **already running n8n in Docker** (~16% mem) behind a reverse proxy on the `hstgr.cloud` domain. Paid through 2026-09-01.

**Plan (do NOT run the deploy yourself — produce the config + a runbook; Arham has SSH root and runs it or grants access):**
- `backend/docker-compose.prod.yml`: a FastAPI (uvicorn/gunicorn) container + a **Postgres 16 container with pgvector** + named volume for DB data. Postgres on a **private Docker network with NO published host port** (only the app container reaches it).
- **First inspect the existing reverse proxy** (n8n's — likely Traefik or nginx-proxy on the box). Reuse it: add a `pakalorie`/`api` subdomain or path route to the FastAPI container, with HTTPS via the proxy's existing certs (Let's Encrypt). Don't stand up a second conflicting proxy. Document what you find.
- Env via an on-box `.env` (never committed): `DATABASE_URL` (internal Docker hostname), `GEMINI_API_KEY`, `CORS_ORIGINS=https://*.expo.dev,exp://*`.
- `backend/docs/DEPLOY.md` runbook: clone/pull on the VPS, `docker compose -f docker-compose.prod.yml up -d`, run `alembic upgrade head` + seed inside the container, wire the proxy route, verify. Include resource limits so we never starve n8n.
- **Open question for Arham (put in TO_CLAUDE.md):** confirm the API subdomain (e.g. `api.<something>` or a path under the existing host) and whether to grant a deploy user or run the runbook himself.

Acceptance: `curl https://<api-subdomain>/healthz` returns 200 over HTTPS from outside the box; Postgres not reachable from the public internet; n8n still healthy; `DEPLOY.md` lets Arham redeploy from scratch.

---

### CDX-008 — Calorie Calculation Engine + RAG (P1 Final, SHOWPIECE) 🔴
**Goal:** Compute calories/macros for a recognized dish + portion by **retrieving** nutrition facts from the food DB and **generating** a grounded answer (RAG) — not hardcoded formulas, and not letting Gemini freelance unguided.

**Pipeline:** recognized dish (from YOLOv8 or the Gemini stub) + portion (from the MiDaS bucket or user) → retrieve top-k nutrition + portion/modifier rules from the food DB (pgvector embeddings, or `pg_trgm` if simpler) → Gemini composes the calorie/macro breakdown grounded ONLY in the retrieved facts, reasoning about portions + modifiers (extra oil, with naan). Return a structured result + a short "why" explanation + the retrieved source rows.

**Deliverables:** `backend/app/services/calorie_engine.py` + a retrieval layer, endpoint `POST /calories` (Pydantic v2 schemas, standard error envelope), and an eval on a handful of known dishes (predicted vs. reference calories) for the report. Free tier: pgvector on the same Postgres + Gemini API.
**Depends on:** CDX-003 (food DB seeded). **Acceptance:** endpoint returns grounded calorie/macro + sources for a test dish set; numbers sane vs. references; Claude reviews in `TO_CLAUDE.md`.

---

### CDX-007 — MiDaS volume & depth (P1 Final, MINIMAL effort) ✅ DONE 2026-06-10 by Claude
**Status:** Implemented, tested (16 pytest incl. real ONNX inference), and merged (PR #4). See the 2026-06-10 block at the top. Remaining: VPS redeploy (`DEPLOY.md` §4b). Original spec below for reference.

**Goal:** Server-side portion/volume estimation from the food photo using a pretrained **MiDaS** monocular-depth model. **Deliberately scoped minimal** — accept partial marks (Arham's call; see `DECISIONS.md`).

**Honest scope:** running pretrained MiDaS to get a relative depth map is easy; converting that to absolute grams from one uncalibrated phone photo is not. So deliver: (a) MiDaS depth-map inference in the backend, (b) a documented heuristic mapping depth + plate-area → a portion-size bucket (small/medium/large multiplier), (c) a clear limitations write-up for the report. Do NOT chase calibrated absolute grams.

**Deliverables:** `backend/app/services/depth.py` (MiDaS inference, e.g. `torch.hub` `intel-isl/MiDaS` small model), a pipeline hook / field that returns a portion multiplier the calorie engine can consume, and a methodology + limitations note.
**Acceptance:** given a food image, returns a relative depth map + a portion bucket; limitations documented. Claude reviews.

---

## Conventions

- **Branching:** `cdx/<task-id>-<short-desc>` per task. PR into `main`.
- **Commits:** `feat(backend): ...`, `fix(backend): ...`. No co-author tags (per Arham's global git settings).
- **Tests:** pytest + httpx async client. 80% coverage on services layer minimum.
- **Style:** ruff format + ruff check. Add to pre-commit.
- **Secrets:** Never commit. Always read from env. `.env.example` documents every var.
