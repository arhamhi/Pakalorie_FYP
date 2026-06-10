# TO_CLAUDE - replies and questions from Codex

Codex writes here when it finishes a session or hits a question that needs taste/architecture decision from Claude.

---

## Open from Codex to Claude

## 2026-06-04 - CDX-005-LIVE-VPS-DEPLOY

**Done:** Deployed the FastAPI app live behind the existing VPS Traefik proxy. API base URL is `https://api.srv987636.hstgr.cloud`. The `pakalorie-api` container was built from the PR branch archive on the VPS, uses the gitignored on-box `backend/.env`, runs `alembic upgrade head` before Uvicorn, joins `root_default` + `pakalorie_net`, and publishes no host port.

**Verification:** `pakalorie-api` is running and healthy. Public `curl -4 -i https://api.srv987636.hstgr.cloud/healthz` returns HTTP 200 with `{"status":"ok"}`. Public DB-backed smoke `https://api.srv987636.hstgr.cloud/foods/search?q=nihari` returns Nihari from `desi_v1`. Traefik local host-header check also returns HTTP 200. Existing n8n still returns HTTP 200 at `https://n8n.srv987636.hstgr.cloud`. Docker inspect shows `pakalorie-api` networks = `pakalorie_net`, `root_default`, ports = `8000/tcp: None`. Docker inspect shows `pakalorie-postgres` still only publishes `127.0.0.1:5432`; external `Test-NetConnection 179.61.246.154 -Port 5432` returns `TcpTestSucceeded=False`.

**Open questions:** None for API deploy. Claude can start Phase 5 mobile wiring against `https://api.srv987636.hstgr.cloud`.

**Risk flags:** This deploy was made from the pushed PR branch `cdx/cdx-005-006-deploy-ml-prep`, not from `main`. Merge PR #2 after review so the repo state matches the live deploy. Keep current client Gemini path as fallback until mobile wiring is smoke-tested on device.

**Files touched:** `.handoff/STATE.md`, `.planning/STATE.md`, `.handoff/TO_CLAUDE.md`, `.handoff/TO_CODEX.md`.

---

## 2026-06-04 - CDX-006-YOLOV8-DATASET-VALIDATION

**Done:** Validated both Kaggle datasets before training and added the reproducible ML scaffold under `ml/`. The second URL (`useractivated/dataset`) is confirmed as the "Pakistani Dishes Dataset", not an unrelated generic dataset. Added `ml/scripts/prepare_dataset.py` for audit, SHA-1 exact dedupe, 224px resize, and stratified train/val split; `ml/scripts/train.py` and `ml/scripts/evaluate.py` for Ultralytics CLI runs; `ml/notebooks/train_yolov8_cls.ipynb` for Colab; `ml/requirements.txt`; `ml/MODELCARD.md`; `ml/models/README.md`; and generated audit outputs in `ml/reports/`.

**Dataset audit summary:** `izbaiman/food-images` = 210 raw class folders, 208 normalized classes, 7,260 images, 390.1 MB local image bytes, 12-75 images/class. `useractivated/dataset` = 14 raw class folders/classes, 1,400 images, 83.1 MB local image bytes, exactly 100 images/class. Merged normalized set = 218 classes, 8,660 images, 473.2 MB local image bytes, min 12 (`white_boiled_rice`), max 175 (`butter_chicken`), 14.58x imbalance. Exact normalized overlaps: `biryani`, `butter_chicken`, `chapati`, `chicken_tikka`. Full merged per-class counts are in `ml/reports/dataset_audit.md`, `ml/reports/dataset_audit.json`, and `ml/reports/class_counts.csv`.

**Open questions:** Need Arham's own food photos for held-out qualitative predictions after training. Decide after the first `yolov8n-cls.pt` run whether to prune noisy/non-Pakistani classes from `izbaiman/food-images` or keep the broad 218-class classifier for the report. Training should start with the full audited set so the baseline is honest.

**Risk flags:** Training has not been run yet; no `best.pt`, `best.onnx`, top-1/top-5, or confusion matrix exists yet. The first dataset is broad/noisy and includes typos/near-duplicates, so model accuracy may be dragged down by class quality and imbalance. Do not wire this into mobile; Gemini remains the live app path.

**Files touched:** `ml/**`, `.handoff/STATE.md`, `.handoff/TO_CODEX.md`, `.planning/STATE.md`, `.handoff/TO_CLAUDE.md`.

---

## 2026-06-04 - CDX-005-VPS-PROD-DEPLOY-PREP

**Done:** Added the production deploy artifacts for the FastAPI app tier. `backend/docker-compose.prod.yml` defines only the `api` service, builds from `backend/Dockerfile`, reads secrets from the on-box `backend/.env`, runs `alembic upgrade head` before production Uvicorn, joins both external Docker networks (`root_default` for Traefik and `pakalorie_net` for the existing Postgres), publishes no host port, applies memory/CPU/PID limits, and adds Traefik labels for `Host(\`api.srv987636.hstgr.cloud\`)` with TLS resolver `mytlschallenge`. Added `backend/docs/DEPLOY.md` with clone/pull, on-box `.env`, deploy, redeploy, health, n8n, and public Postgres-closed checks. Added `backend/.dockerignore` so the on-box `.env` is not copied into the Docker image. Updated `backend/.env.example` with the production internal-DB URL shape. Validation: `docker compose -f docker-compose.prod.yml config --quiet --no-env-resolution` passes.

**Open questions:** Confirm the API subdomain before live deploy. I used `api.srv987636.hstgr.cloud` because it mirrors the existing n8n host pattern, but Arham should verify it resolves to `179.61.246.154` or choose a different host before certificate issuance. Arham also needs to either run `backend/docs/DEPLOY.md` on the VPS or grant Codex SSH approval for the actual deploy.

**Risk flags:** The API is not live yet. Acceptance still requires an outside-box `curl https://api.srv987636.hstgr.cloud/healthz` returning 200, `pakalorie-postgres` still closed to the public internet, and `root-n8n-1`/`root-traefik-1` still healthy after deploy. Do not wire the mobile app to this base URL until that HTTPS check passes.

**Files touched:** `backend/docker-compose.prod.yml`, `backend/docs/DEPLOY.md`, `backend/.dockerignore`, `backend/.env.example`, `.handoff/STATE.md`, `.planning/STATE.md`, `.handoff/TO_CLAUDE.md`.

---

## 2026-06-03 - CDX-P1FINAL-FOODBACKEND

**Done:** Implemented the foundational backend lane in `backend/`: FastAPI scaffold, async SQLAlchemy models, Alembic baseline, dev Docker Compose, in-repo desi seed, filtered USDA Foundation Foods extract, idempotent seed script, food endpoints, server-side Gemini recognition route, and `POST /calories` grounded calorie engine. Added typed response models so OpenAPI documents the endpoint contracts, plus `backend/docs/API_CONTRACT.md` for mobile wiring and `backend/docs/LOCAL_DB_SMOKE.md` for the next DB verification run. Backend package metadata now builds/install via `uv sync`, Dockerfile is corrected for `pip install .`, and root `.pre-commit-config.yaml` runs ruff on backend files. Local Uvicorn health/OpenAPI smoke passed: `GET /healthz` returned `{"status":"ok"}` and `/openapi.json` lists all backend paths. Ruff is green; pytest is green with 9 tests, including seed invariants and missing Gemini key envelope behavior.

**Endpoint shapes for mobile wiring:**
- `POST /recognize` multipart field `image` -> `{success,data:{food_label,confidence,alternatives:[{food_label,confidence}]},error}`. Requires server `GEMINI_API_KEY`.
- `GET /foods/search?q=<text>&limit=10` -> `{success,data:[{id,name_en,name_ur,category,source,default_portion,score}],error}`.
- `GET /foods/{id}` -> `{success,data:{id,name_en,name_ur,category,source,base_unit,aliases,portions,modifiers},error}`.
- `POST /foods/{id}/nutrition` body `{portion:"<label or id>",modifiers:["<name>"]}` -> adjusted kcal/macros. Portion/modifiers must belong to that food. Desi `fiber_g` can be `null`.
- `POST /calories` body `{recognized_dish,portion?,modifiers?,top_k?}` -> `{food_id,food_label,portion_label,calories_kcal,protein_g,carbs_g,fat_g,fiber_g,applied_modifiers,ignored_modifiers,why,model_used,source_rows}`.

**Open questions:** None for Claude until DB smoke/deploy is verified. Once API is reachable, wire `src/lib/api.ts` against the shapes above and keep current client Gemini path as fallback.

**Risk flags:** Full live DB verification is blocked by local Docker Desktop instability. `docker compose up db -d` pulled `pgvector/pgvector:pg16`, then failed container creation with Docker API `502 Bad Gateway`; retry hit Docker CLI `pageAlloc: out of memory`. After restarting Docker Desktop, escalated `docker info` still hung; a later `docker info` retry also hung and was stopped. Alembic SQL renders offline and seed data normalizes to 160 rows, but `alembic upgrade head && python -m scripts.seed_foods` still needs a healthy Docker/Postgres run. Recognition/calorie Gemini generation needs `GEMINI_API_KEY`; no key is committed.

**Files touched:** `.gitignore`, `.pre-commit-config.yaml`, `backend/**`, `.handoff/STATE.md`, `.handoff/DECISIONS.md`, `.handoff/TO_CLAUDE.md`, `.handoff/TO_CODEX.md`, `.planning/STATE.md`.

---

## 2026-05-19 - EXPO-GO-FIREBASE-RUNTIME-FIX

**Done:** Fixed the Expo Go runtime crash `Component auth has not been registered yet` by adding `src/lib/firebaseAuth.ts`, which imports Firebase Auth's browser ESM bundle directly and avoids Metro's React Native/CJS Auth registry split. `src/lib/firebase.ts` now uses that wrapper with AsyncStorage-backed persistence. iOS export bundling completes.

**Open questions:** None.

**Risk flags:** Full device smoke-test still depends on Arham scanning the QR and walking email/password signup/login. The repo still has an unrelated dirty `.gitignore` Expo-generated block from before this fix.

**Files touched:** `src/lib/firebaseAuth.ts`, `src/lib/firebase.ts`, `src/contexts/AuthContext.tsx`, `.handoff/STATE.md`, `.planning/STATE.md`, `.handoff/TO_CLAUDE.md`, `.handoff/DECISIONS.md`.

---

## 2026-05-19 - EXPO-GO-FIREBASE-REVERSAL

**Done:** Reversed the native Firebase path back to Firebase JS SDK so Arham can run `npx expo start` and test with Expo Go. Removed native Firebase/Google dependencies and config plugins, rewired `AuthContext` to modular Firebase Auth/Firestore, added `src/hooks/useGoogleAuthSession.ts`, and updated docs/handoff state.

**Open questions:** Decide whether Google OAuth must be part of the live P1 Mid demo. If yes, schedule a dev-build/prod-build verification pass; if no, keep the live demo on email/password through Expo Go.

**Risk flags:** Google OAuth is not an Expo Go feature because AuthSession needs a development/production build with the app's custom scheme. `android/` is still a stale generated folder from the earlier native prebuild and should not be treated as current source of truth.

**Files touched:** `package.json`, `package-lock.json`, `app.json`, `.env.example`, `src/lib/firebase.ts`, `src/lib/authErrors.ts`, `src/types/auth.ts`, `src/contexts/AuthContext.tsx`, `src/hooks/useGoogleAuthSession.ts`, `app/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `README.md`, `docs/PRD.md`, `.planning/STATE.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.handoff/STATE.md`, `.handoff/DECISIONS.md`, `.handoff/TO_CLAUDE.md`.

---

## 2026-05-07 - AGENT-PROTOCOL

**Done:** Added repo-level operating instructions for the two-agent workflow: `AGENTS.md`, `.agents/CODEX.md`, `CLAUDE.md`, and `.claude/CLAUDE.md`.

**Open questions:** None.

**Risk flags:** None. Root `CLAUDE.md` points Claude Code to `.claude/CLAUDE.md`.

**Files touched:** `AGENTS.md`, `.agents/CODEX.md`, `CLAUDE.md`, `.claude/CLAUDE.md`, `.handoff/STATE.md`, `.handoff/DECISIONS.md`, `.handoff/TO_CLAUDE.md`.

---

## Conventions

When Codex finishes a session, append a new `## YYYY-MM-DD - <task-id>` block with:

- **Done:** what shipped
- **Open questions:** decisions Codex needs Claude to make
- **Risk flags:** anything that might bite us in P1 Mid demo
- **Files touched:** relative paths
