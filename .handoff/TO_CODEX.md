# TO_CODEX — task queue for Codex CLI

Codex's lane: **backend (FastAPI + PostgreSQL), Firestore migration, infra, dataset prep**.
Read `STATE.md` first. After each session, update `STATE.md`, append to `DECISIONS.md`, and write your reply in `TO_CLAUDE.md`.

---

## Active queue

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
- Local Postgres via `docker-compose.yml` (Postgres 16) for dev.
- `.env.example` documenting required vars: `DATABASE_URL`, `GEMINI_API_KEY`, `CORS_ORIGINS`.

Acceptance: `uvicorn app.main:app --reload` runs locally, `curl localhost:8000/healthz` returns 200.

---

### CDX-003 — PostgreSQL schema + seed (Week 2)
**Goal:** Schema for `foods`, `food_aliases`, `nutrition_facts`, `portion_sizes`. Seed from v1 dataset.

Source for seed data: `C:\Users\Arham\OneDrive\Desktop\AI Work\Pakalorie\pakalorie_food_database.json` (100+ Pakistani dishes with portion variants + modifiers).

- SQLAlchemy 2.0 models with `Mapped[]` syntax.
- Alembic migrations (`alembic init`, baseline migration committed).
- Seed script `backend/scripts/seed_foods.py` — idempotent (re-runnable without duplicates).
- Augment with USDA FoodData Central public dump for global items (download from https://fdc.nal.usda.gov/download-datasets).

Acceptance: `alembic upgrade head && python -m scripts.seed_foods` populates the DB. `SELECT COUNT(*) FROM foods` returns ≥150 rows.

---

### CDX-004 — API endpoints (Week 3)
**Goal:** Implement the 4 P1 Mid endpoints.

1. `POST /recognize` — accepts multipart image, calls Gemini Vision (server-side), returns `{food_label, confidence, alternatives[]}`. Reuse logic from `src/lib/gemini.ts` but harden it (timeout, retry, error envelope).
2. `GET /foods/search?q=` — fuzzy search by name (English + Roman Urdu aliases). Use Postgres `pg_trgm` extension for trigram similarity.
3. `GET /foods/{id}` — full nutrition + portion variants.
4. `POST /foods/{id}/nutrition` — accepts `{portion_size: "small"|"medium"|"large", modifiers: ["extra_oil","with_naan"]}`, returns adjusted calorie/macro per the v1 modifier formula (Final = Base × Scale + ModifierConstant).

Validation: Pydantic v2 schemas, consistent error envelope `{success: bool, data: T|null, error: string|null}`.

Acceptance: All 4 endpoints documented in OpenAPI (auto-generated). Claude wires `src/lib/api.ts` to them in mobile app.

---

### CDX-005 — Render deploy (Week 3)
**Goal:** Deploy FastAPI to Render free tier. Postgres on Supabase Postgres or Neon free tier (whichever has cleaner connection pooling).

- `render.yaml` infrastructure-as-code.
- Env vars set via Render dashboard: `DATABASE_URL`, `GEMINI_API_KEY`, `CORS_ORIGINS=https://*.expo.dev,exp://*`.
- Document keep-alive cron strategy (free tier cold-starts after 15min idle — violates FR8 latency target).

Acceptance: `curl https://<deployed-url>/healthz` returns 200 over HTTPS. Cold-start latency documented.

---

## Conventions

- **Branching:** `cdx/<task-id>-<short-desc>` per task. PR into `main`.
- **Commits:** `feat(backend): ...`, `fix(backend): ...`. No co-author tags (per Arham's global git settings).
- **Tests:** pytest + httpx async client. 80% coverage on services layer minimum.
- **Style:** ruff format + ruff check. Add to pre-commit.
- **Secrets:** Never commit. Always read from env. `.env.example` documents every var.
