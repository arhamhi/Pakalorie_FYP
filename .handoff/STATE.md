# STATE â€” single source of truth on current code state

**Last updated:** 2026-06-04 by Codex (Metro Windows/OneDrive bundler fix: `metro.config.js` now blocks backend/ML/cache/output folders from Metro crawling; `npx expo export --platform ios --clear` completed successfully)
**Next action owner:** Arham (on-device smoke test of the scan -> backend result flow in Expo Go — see "What Arham needs to test on device" below); Codex (next ML step is Colab YOLOv8n-cls training from `ml/notebooks/train_yolov8_cls.ipynb`, then CDX-007 MiDaS); Arham also still to provide own held-out food photos for YOLO qualitative tests.

---

## Repo state

- Forked from `C:\Users\Arham\OneDrive\Desktop\AI Work\Pakalorie_v2\app` on 2026-05-07.
- Pushed to https://github.com/arhamhi/Pakalorie_FYP (private).
- Branch: `main`, tracking `origin/main`.
- Firebase Console fully set up (project created, providers enabled, Android + iOS apps registered, Firestore in Standard edition / region `asia-south1`).
- `google-services.json` and `GoogleService-Info.plist` are present at repo root (gitignored) but are reference files only now; the Expo Go path reads Firebase config from `.env`.
- `app.json` keeps Google Web/iOS client IDs for the AuthSession path. Native Firebase/Google config plugins were removed.

## What works

- **NEW (2026-06-04 Claude) — Phase 5 mobile wiring to the live backend (code-complete, device test pending):**
  - Added `src/lib/api.ts`: a typed client for the live API base URL `https://api.srv987636.hstgr.cloud` (reads `EXPO_PUBLIC_API_BASE_URL`, falls back to that same URL). Includes request timeout + `AbortController` (20s default, 30s for recognition), envelope unwrapping (`{success,data,error}`), an `ApiError` type, and a wrapper per documented endpoint: `checkHealth()`, `recognizeFood()`, `searchFoods()`, `getFood()`, `getAdjustedNutrition()`, `groundCalories()`, plus the orchestrator `recognizeAndGroundFood()` (image -> `POST /recognize` -> `POST /calories`, mapped into the screen's `FoodIdentificationResult` shape + `grounded` provenance). **No Gemini key is sent from the client** — recognition is server-side.
  - `app/(tabs)/scan.tsx` `runAnalysis()` now tries the real pipeline first and **automatically falls back to the existing client-side Gemini path** (`src/lib/gemini.ts` `identifyFood`) on any backend failure/timeout/"Unknown". The Gemini fallback is unchanged and still present (guardrail).
  - Results UI shows the real pipeline output without a redesign: a `DB-grounded` vs `AI estimate` source pill under the dish name, and a "How we got this" card (backend path only) surfacing the matched DB row + portion, the engine's `why`, the data source (`desi_v1` -> "Pakistani food database" / `usda` -> "USDA reference"), and `model_used`. Null fiber still renders as "—" (tolerated). Alternatives now tolerate the recognize shape (confidence `% match` when calorie estimate is absent).
  - `.env.example` `EXPO_PUBLIC_API_BASE_URL` corrected from the stale Render placeholder to the live VPS URL.
  - **Verified locally:** `node scripts/api-smoke.mjs` (new) = **10/10 PASS** against the live API (health, search, detail + null fiber, nutrition modifier math 255+60=315, grounded `/calories` with `why`/`model_used`/`source_rows`). `npx tsc --noEmit` shows **no errors in `api.ts`, `gemini.ts`, or `scan.tsx`** (the 4 remaining tsc errors are pre-existing v2 drift in `notifications.tsx`/`notifications.ts`/`FadeInView.tsx`/`ThemeContext.tsx`, untouched by this work). `POST /recognize` (multipart image) is the only path not exercisable headless — it needs the on-device test below.

- **NEW (2026-06-04 Codex) — Expo/Metro bundling unblocked on Windows/OneDrive:**
  - `metro.config.js` now excludes non-mobile project folders from Metro's file crawl: `backend`, `ml`, `dist`, `.expo`, `.tmp`, `.pytest_cache`, `.ruff_cache`, `.mypy_cache`, `.uv-cache`.
  - This fixes the local `backend\.pytest_cache` EPERM crawl warning and the likely source of the `jest-worker ... signal=SIGTERM` iOS bundling failure.
  - **Verified locally:** `npx expo export --platform ios --clear` completed successfully: `iOS Bundled ... (5017 modules)` and exported to `dist`. No Pakalorie Expo/Metro Node workers were left running after verification.
  - If Windows still kills workers while using Expo Go, start with fewer Metro workers: `npx expo start -c --max-workers 2`.

- **VERIFIED (2026-06-03 Claude) — backend is now proven against a real Postgres, not just mocks:**
  - A dedicated **pgvector Postgres 16 container runs on the Hostinger VPS** (`pakalorie-postgres`), isolated on its own Docker network + volume, **bound to `127.0.0.1:5432` only** (not public), strong generated password, `--restart unless-stopped`. n8n + Traefik confirmed unaffected. Laptop reaches it via an SSH tunnel (`localhost:5432 → VPS`).
  - `alembic upgrade head` succeeds on the live DB (migration ↔ models proven). `pg_trgm` + `vector` extensions installed.
  - `python -m scripts.seed_foods` → **`foods=160, desi_v1=30, usda=130`**, idempotent (re-run keeps 160).
  - Every endpoint smoke-tested against real data: `/healthz`; `/foods/search?q=nihari` (Nihari ranks #1, score 1.0, Urdu alias present); `/foods/meat_01` (full detail, `source=desi_v1`, null fiber, modifiers); `/foods/meat_01/nutrition` (255+60=315 kcal, null fiber; foreign portion/modifier → 422); `/calories` (real Gemini grounded path = `gemini_grounded`, and the no-key path = `local_grounded_fallback`, both = 315 kcal grounded in source rows); `/recognize` (multipart → server-side Gemini vision → `{food_label,confidence,alternatives}`; non-food image correctly returns "Unknown"). **Real-desi-photo recognition now VERIFIED (2026-06-04):** `test_food.webp` -> `Haleem` @ 0.98 confidence with sensible look-alike alternatives (Dal Gosht, Hareesa, Khichra); `.webp` input handled. The full recognition path is proven end to end.
  - **Bug found & fixed:** `gemini-3-flash-preview` is a thinking model; thinking tokens count against `maxOutputTokens`, so the calorie/recognition JSON was truncated (`MAX_TOKENS` → unparseable → 502). Fixed in `app/services/gemini.py`: request native `application/json` output and default `thinkingBudget=0` for the JSON client.
  - **Live-DB integration suite** added (`backend/tests/test_integration.py`, marker `integration`): seed counts/provenance, search, detail + null/desi vs present/usda fiber, modifier math + 422s, grounded fallback. Auto-skips when no DB is reachable, so the fast unit run still works with no DB. `ruff` clean; `pytest` green (9 unit + 8 integration with the tunnel up).
- **NEW (2026-06-04 Codex):** CDX-005 deploy artifacts are ready for VPS execution: `backend/docker-compose.prod.yml` defines only the FastAPI `api` service, joins the existing `root_default` Traefik network and `pakalorie_net` Postgres network, publishes no host port, runs `alembic upgrade head` before production Uvicorn, sets memory/CPU/PID limits, and routes `Host(\`api.srv987636.hstgr.cloud\`)` through Traefik TLS resolver `mytlschallenge`. `backend/docs/DEPLOY.md` documents the on-box `.env`, deploy, redeploy, HTTPS checks, n8n health check, and public Postgres-closed check. `backend/.dockerignore` prevents on-box `.env` secrets from being copied into the image. `docker compose -f docker-compose.prod.yml config --quiet --no-env-resolution` passes.
- **NEW (2026-06-04 Codex):** CDX-005 is LIVE. Deployed `pakalorie-api` on the Hostinger VPS from PR branch `cdx/cdx-005-006-deploy-ml-prep`; production compose built `pakalorie-api:latest`; `pakalorie-api` is healthy, attached to `root_default` + `pakalorie_net`, and publishes no host port (`8000/tcp: None`). Public HTTPS check passes: `curl -4 -i https://api.srv987636.hstgr.cloud/healthz` -> HTTP 200 `{"status":"ok"}`. Public DB-backed smoke passes: `/foods/search?q=nihari` returns Nihari from `desi_v1`. n8n still returns HTTP 200 at `https://n8n.srv987636.hstgr.cloud`. Postgres remains private: external `Test-NetConnection 179.61.246.154 -Port 5432` -> `TcpTestSucceeded=False`; Docker inspect shows `pakalorie-postgres` still only publishes `127.0.0.1:5432`.
- **NEW (2026-06-04 Codex):** CDX-006 dataset validation is complete before training. Kaggle metadata + local download confirmed `useractivated/dataset` is the Pakistani Dishes Dataset, not an unrelated generic dataset. Local audit results: `izbaiman/food-images` = 210 raw folders, 208 normalized classes, 7,260 images, 390.1 MB image bytes, 12-75 images/class; `useractivated/dataset` = 14 folders/classes, 1,400 images, 83.1 MB image bytes, exactly 100/class; merged normalized set = 218 classes, 8,660 images, 473.2 MB image bytes, 12-175 images/class, 14.58x imbalance. Full counts live in `ml/reports/dataset_audit.md`, `ml/reports/dataset_audit.json`, and `ml/reports/class_counts.csv`. Added `ml/` scaffold: dataset prep/audit, train/eval scripts, Colab notebook, requirements, draft model card, and model artifact placeholder. Training has not been run yet.
- **NEW (2026-06-03 Codex):** `backend/` FastAPI service exists on branch `cdx/p1final-foodbackend`.
- **NEW (2026-06-03 Codex):** Local health smoke works through Uvicorn: `GET /healthz` returned `{"status":"ok"}` on `http://127.0.0.1:8000`.
- **NEW (2026-06-03 Codex):** `backend/docker-compose.yml` defines FastAPI + `pgvector/pgvector:pg16` Postgres with named volume. Docker image pull completed, but Docker Desktop failed container creation with a 502/OOM, so full `docker compose up db -d` verification is still pending.
- **NEW (2026-06-03 Codex):** Alembic baseline exists and renders offline SQL cleanly. It enables `pg_trgm` + `vector` and creates `foods`, `food_aliases`, `nutrition_facts`, `portion_sizes`, `modifier_constants`.
- **NEW (2026-06-03 Codex):** Seed files exist in-repo: `backend/data/desi_seed.json` (30 curated desi dishes) + `backend/data/usda_foundation_sample.json` (130 USDA Foundation Foods rows). Seed normalizer validates total target = 160 rows. Live DB seed run is pending Docker stability.
- **NEW (2026-06-03 Codex):** Endpoints implemented: `POST /recognize`, `GET /foods/search`, `GET /foods/{id}`, `POST /foods/{id}/nutrition`, `POST /calories`. All non-health endpoints return `{success,data,error}` envelopes.
- **NEW (2026-06-03 Codex):** `POST /calories` retrieves nutrition rows first via `pg_trgm`, then uses Gemini when `GEMINI_API_KEY` is configured, with a deterministic local grounded fallback for tests/no-key mode. pgvector is enabled in the DB for future embedding retrieval.
- **NEW (2026-06-03 Codex):** Backend handoff docs exist: `backend/docs/API_CONTRACT.md` for Claude mobile wiring and `backend/docs/LOCAL_DB_SMOKE.md` for the next DB verification attempt.
- **NEW (2026-06-03 Codex):** Backend package metadata is installable (`uv sync` builds `pakalorie-backend==0.1.0`); Dockerfile now copies source before `pip install .`.
- **NEW (2026-06-03 Codex):** OpenAPI now has typed response models for the backend endpoints. Live Uvicorn smoke verified `/healthz` and `/openapi.json` paths.
- **NEW (2026-06-03 Codex):** Root `.pre-commit-config.yaml` added for backend ruff check/format hooks.
- **NEW (2026-06-03 Codex):** Backend pytest coverage now includes 9 tests: calorie engine fallback, nutrition modifier math, health, missing Gemini key error envelope, OpenAPI route docs, and seed invariants for 30 desi + 130 USDA rows.
- All 14 v2 tab screens compile (Expo SDK 54, NativeWind, Expo Router, TanStack Query).
- Color tokens defined in `src/constants/colors.ts` â€” surface/text/accent semantic tokens, light + dark.
- 3 accents already live: green `#1BAD66`, gold `#FFC107`, coral `#FF6B6B`.
- **Day 2:** Firebase + Google Sign-In + Geist + Instrument Serif installed.
- **Day 2 / revised 2026-05-19:** `src/lib/firebase.ts` initializes the Firebase JS SDK from `EXPO_PUBLIC_FIREBASE_*` values and configures AsyncStorage-backed auth persistence through an Expo Go-safe Firebase Auth ESM wrapper.
- **Day 2 / revised 2026-05-19:** `src/contexts/AuthContext.tsx` uses Firebase JS Auth + Firestore modular APIs. API surface preserved except `signInWithGoogle` now receives an AuthSession ID token.
- **Day 2:** `src/types/profile.ts` defines Firestore-shaped Profile (re-exported from `database.ts` for backwards-compat).
- **Day 2 / revised 2026-05-19:** `src/lib/authErrors.ts` normalizes Firebase + Google AuthSession errors into project `AuthError` shape.
- **NEW (Day 3):** `src/constants/fonts.ts` exports `FontFamily` + `Type` token system (Geist + Instrument Serif).
- **NEW (Day 3):** `src/constants/spacing.ts` exports `Spacing` (8pt grid) + `Radius` tokens.
- **NEW (Day 3 / revised 2026-05-19):** `app/_layout.tsx` loads Geist + Instrument Serif (legacy fonts kept loaded so un-migrated v2 screens keep rendering). Native Google configuration was removed.
- **NEW (Day 3):** `app/index.tsx` is now a pure auth-state router â†’ `/(auth)/welcome` for unauthed users, `/onboarding/goal` for authed-but-not-onboarded users, `/(tabs)` otherwise.
- **NEW (Day 3):** `app/(auth)/{_layout,welcome,login,signup,forgot-password}.tsx` shipped with Geist + 70/20/10 token styling.
- **NEW (Day 3):** `src/components/auth/AuthFormPrimitives.tsx` â€” shared atoms (AuthHeader, AuthInput, PrimaryButton, GoogleButton, Divider, FootLink) used across the form screens.
- **NEW (Day 3):** TypeScript clean across all Day 3 files. Pre-existing v2 errors unchanged (still documented for Phase 2).
- **NEW (Day 3.5):** Phosphor adopted (`phosphor-react-native`). All new code uses `*Icon` exports; `@expo/vector-icons` banned in new code.
- **NEW (Day 4-5):** `app/(tabs)/scan.tsx` rewritten against DESIGN.md Â§5 â€” Phosphor icons, Geist + Instrument Serif typography, 70/20/10 tokens. Hero numeric (Instrument Serif), 4-card macro grid (now includes Fiber), confidence pill, alternatives card when confidence <70%, medical disclaimer footer, "Save to history" sticky CTA, denied-permission card with "Open settings" fallback. Servings stepper / modifiers / meal type / notes preserved from v2 but restyled. Type-check clean for the rewritten file.
- **NEW (2026-05-19):** `src/hooks/useGoogleAuthSession.ts` wires Google OAuth through `expo-auth-session`. It deliberately returns a clear Expo Go error because OAuth needs a development/production build with the app's custom scheme.
- **FIX (2026-05-19):** `src/lib/firebaseAuth.ts` bypasses Metro's React Native Firebase Auth bundle and imports Firebase Auth's browser ESM bundle directly. This keeps Auth on the same Firebase app/component registry as `firebase/app` and addresses the Expo Go runtime crash: `Component auth has not been registered yet`.

## What's broken / stubbed

- Scan/auth flows haven't been smoke-tested end-to-end on device yet â€” Arham to run `npx expo start -c --max-workers 2`, scan with Expo Go, and exercise: welcome â†’ signup/login with email â†’ scan â†’ result â†’ save â†’ history.
- Google OAuth is code-wired but not an Expo Go acceptance item. Test it in a dev/production build only if it must appear in the P1 Mid live demo.
- Save-to-history STILL writes to Supabase `food_logs`, not Firestore. The v2 read paths in `app/(tabs)/index.tsx` and `app/(tabs)/calendar-log.tsx` still read from Supabase, so flipping save in isolation breaks history. Migration paired with CDX-001 (Codex's Firestore migration spec).
- AuthContext methods `signInWithApple`, `signInWithPhone`, `verifyOtp` throw `not-implemented` â€” deferred to P1 Final / P2.
- Pre-existing v2 type errors in `chat.tsx`, `notifications.tsx`, `search.tsx`, `index.tsx`, `settings.tsx` â€” not from auth/scan migration; will fix when those screens are touched.
- v2's existing `app/onboarding/auth.tsx` is now superseded by the new `(auth)` group but still on disk; only reachable from the onboarding flow. Decision pending: rip it out or wire onboarding to redirect to `(auth)/login`.
- v2 legacy screens still reference `@expo/vector-icons` + PlusJakartaSans/IBMPlexMono. New code is on Phosphor + Geist; sweep happens piecemeal as those screens get touched.
- `android/` folder is still committed from the earlier native prebuild. It is stale for the Expo Go path; do not treat it as source of truth unless a future session intentionally regenerates it.
- ~~Docker Desktop is currently unstable on this machine for DB integration...~~ **RESOLVED (2026-06-03 Claude):** stopped fighting local Docker Desktop. The DB now runs on the always-on **VPS** (pgvector container, 127.0.0.1-only) and is reached from the laptop over an SSH tunnel. Migration + seed + full endpoint smoke + integration tests all pass against it. Local Docker is no longer on the critical path.
- ~~`/recognize` real-dish accuracy is unproven...~~ **RESOLVED (2026-06-04):** verified on a real photo (`test_food.webp` -> `Haleem` @ 0.98, plus sensible alternatives; `.webp` handled). Recognition is proven end to end.

## Current target: P1 Final (7th-sem FINAL, cumulative 50%, due before July 2026)

FYP = 12 modules / 4 milestones / 25% each. **P1 Mid (Auth + Capture/Results UI + YOLOv8-as-Gemini-stub) was SUBMITTED at midterm = 25%.** Current target = **P1 Final** (next 25%, cumulative 50%).

**P1 Final â€” 3 graded modules + 1 carryover (all active):**
1. **Food Database API** â€” FastAPI + PostgreSQL + seed (â‰¥150 desi dishes). Foundational. (Codex CDX-002..005.)
2. **Calorie Calculation Engine + RAG** â€” retrieve nutrition from the food DB, Gemini generates a grounded calorie/macro breakdown. Showpiece. (Codex CDX-008.)
3. **Volume & Depth Estimation â€” MiDaS** â€” minimal effort, accept partial marks. (Codex CDX-007.)
4. **(carryover) YOLOv8 real training** â€” replaces the Gemini recognition stub; classification model on Kaggle desi-food data. (Codex CDX-006.)

**Already done (P1 Mid, submitted at midterm):** Authentication âœ…, Capture/Results UI âœ…. Both on the Expo Go / Firebase JS SDK path (end-to-end device smoke-test still pending â€” see below).

**Claude's P1 Final work:** wire the mobile app to the new FastAPI endpoints (`src/lib/api.ts`), update the results screen to show the real pipeline output (recognition â†’ portion â†’ grounded calorie breakdown), demo + docs. Most of P1 Final is Codex's backend/ML lane.

**Later (P2, 8th sem):** Model Optimization & Quantization, Data Viz + Calorie Compensation, Real-Time Inference Pipeline, Urdu Localization, Health Data Sync, AI Chat Coach.

Full mapping + rationale: `DECISIONS.md` (2026-06-03).

## What's next (immediate)

1. **DONE 2026-06-03:** `.planning/{PROJECT,REQUIREMENTS,ROADMAP,STATE}.md` re-baselined to **v1.1 P1 Final** (Food DB API + Calorie Engine/RAG + MiDaS + YOLOv8 carryover + wiring/demo/docs). Hand-edited, no `/gsd-*`. Deploy switched Renderâ†’VPS; seed corrected to 30 desi + USDA; CDX-002..005 updated for pgvector/labeled-portions/VPS.
2. **Arham (inputs that unblock Codex):** gather own food test photos (held-out YOLO test set); keep smoke-testing Expo Go.
3. **Codex (priority order):** _Updated 2026-06-04 (Codex): CDX-002/003/004/005/008 are DONE and verified, with the API live at `https://api.srv987636.hstgr.cloud`. CDX-006 dataset validation + training scaffold is done; training itself is still pending._ Next: run Colab `yolov8n-cls` training/eval for CDX-006; CDX-007 remains last/minimal.
4. **DONE 2026-06-04 (Claude, Phase 5), code-complete; on-device test pending:** wired `src/lib/api.ts` to `https://api.srv987636.hstgr.cloud` + update the Results screen to show the real pipeline (recognition â†’ portion â†’ grounded calorie breakdown + "why" + sources); keep Gemini as fallback until proven. Then SDS material + demo prep.
5. **Open:** Google OAuth dev-build need for the live demo vs. email/password through Expo Go.

## What Arham needs to test on device (Phase 5 backend wiring)

The scan flow is wired to the live backend in code and the API contract is verified (10/10 smoke via `node scripts/api-smoke.mjs`, touched-file typecheck clean), but the `POST /recognize` multipart image upload can only be exercised on a real device. Run `npx expo start -c --max-workers 2`, open in Expo Go, and check:

1. Camera or gallery -> take/pick a desi food photo -> the result screen appears.
2. The result shows a green "DB-grounded" pill under the dish name (the live pipeline ran). Calories/macros come from the backend, and the "How we got this" card shows the matched DB row + portion, the engine's "why", the data source ("Pakistani food database"), and the model.
3. A null-fiber dish (most desi dishes) shows a dash in the Fiber card, no crash.
4. Turn off Wi-Fi/data (or point `EXPO_PUBLIC_API_BASE_URL` at a dead host) and scan again: it should fall back to the on-device Gemini path and show an "AI estimate" pill instead, still producing a full result. The fallback needs `EXPO_PUBLIC_GEMINI_API_KEY` in `.env`.
5. "Save to history" still works (still writes to Supabase until CDX-001).

If recognition returns "Unknown" on a clear food photo, note the dish + photo so the prompt/model can be tuned. Report results in `TO_CLAUDE.md`.

## Plan reference

Full plan at `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`.
