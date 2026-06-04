# STATE â€” single source of truth on current code state

**Last updated:** 2026-06-03 by Claude (backend VERIFIED against live VPS Postgres: migrated + seeded 160 rows + every endpoint smoke-tested + live-DB integration suite added; found & fixed a Gemini thinking-token truncation bug; recognition later verified on a real photo on 2026-06-04 - Haleem @ 0.98)
**Next action owner:** Codex (CDX-005 — containerize the FastAPI app behind the existing Traefik proxy + API subdomain + HTTPS; the DB is already up, seeded, and proven on the VPS); Arham (Kaggle dataset URL(s) for CDX-006; pick the API subdomain); Claude (Phase 5 mobile wiring once the API is publicly reachable).

---

## Repo state

- Forked from `C:\Users\Arham\OneDrive\Desktop\AI Work\Pakalorie_v2\app` on 2026-05-07.
- Pushed to https://github.com/arhamhi/Pakalorie_FYP (private).
- Branch: `main`, tracking `origin/main`.
- Firebase Console fully set up (project created, providers enabled, Android + iOS apps registered, Firestore in Standard edition / region `asia-south1`).
- `google-services.json` and `GoogleService-Info.plist` are present at repo root (gitignored) but are reference files only now; the Expo Go path reads Firebase config from `.env`.
- `app.json` keeps Google Web/iOS client IDs for the AuthSession path. Native Firebase/Google config plugins were removed.

## What works

- **VERIFIED (2026-06-03 Claude) — backend is now proven against a real Postgres, not just mocks:**
  - A dedicated **pgvector Postgres 16 container runs on the Hostinger VPS** (`pakalorie-postgres`), isolated on its own Docker network + volume, **bound to `127.0.0.1:5432` only** (not public), strong generated password, `--restart unless-stopped`. n8n + Traefik confirmed unaffected. Laptop reaches it via an SSH tunnel (`localhost:5432 → VPS`).
  - `alembic upgrade head` succeeds on the live DB (migration ↔ models proven). `pg_trgm` + `vector` extensions installed.
  - `python -m scripts.seed_foods` → **`foods=160, desi_v1=30, usda=130`**, idempotent (re-run keeps 160).
  - Every endpoint smoke-tested against real data: `/healthz`; `/foods/search?q=nihari` (Nihari ranks #1, score 1.0, Urdu alias present); `/foods/meat_01` (full detail, `source=desi_v1`, null fiber, modifiers); `/foods/meat_01/nutrition` (255+60=315 kcal, null fiber; foreign portion/modifier → 422); `/calories` (real Gemini grounded path = `gemini_grounded`, and the no-key path = `local_grounded_fallback`, both = 315 kcal grounded in source rows); `/recognize` (multipart → server-side Gemini vision → `{food_label,confidence,alternatives}`; non-food image correctly returns "Unknown"). **Real-desi-photo recognition now VERIFIED (2026-06-04):** `test_food.webp` -> `Haleem` @ 0.98 confidence with sensible look-alike alternatives (Dal Gosht, Hareesa, Khichra); `.webp` input handled. The full recognition path is proven end to end.
  - **Bug found & fixed:** `gemini-3-flash-preview` is a thinking model; thinking tokens count against `maxOutputTokens`, so the calorie/recognition JSON was truncated (`MAX_TOKENS` → unparseable → 502). Fixed in `app/services/gemini.py`: request native `application/json` output and default `thinkingBudget=0` for the JSON client.
  - **Live-DB integration suite** added (`backend/tests/test_integration.py`, marker `integration`): seed counts/provenance, search, detail + null/desi vs present/usda fiber, modifier math + 422s, grounded fallback. Auto-skips when no DB is reachable, so the fast unit run still works with no DB. `ruff` clean; `pytest` green (9 unit + 8 integration with the tunnel up).
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

- Scan/auth flows haven't been smoke-tested end-to-end on device yet â€” Arham to run `npx expo start -c`, scan with Expo Go, and exercise: welcome â†’ signup/login with email â†’ scan â†’ result â†’ save â†’ history.
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
2. **Arham (inputs that unblock Codex):** (a) paste the Kaggle desi-food dataset URL(s) â†’ unblocks CDX-006; (b) VPS deploy access (SSH root or deploy user) + chosen API subdomain â†’ unblocks CDX-005; (c) confirm seed JSON path `C:\Users\Arham\OneDrive\Desktop\AI Work\Pakalorie\pakalorie_food_database.json` (verified present, 30 dishes); (d) gather own food test photos (held-out YOLO test set); (e) keep smoke-testing Expo Go.
3. **Codex (priority order):** _Updated 2026-06-03 (Claude): CDX-002/003/004/008 are DONE and verified against the live VPS Postgres; only **CDX-005** remains and is now narrowed (DB already up + seeded on the VPS, just containerize the app behind Traefik + subdomain + HTTPS, see `TO_CODEX.md`). Original sequence kept below for history._ CDX-002 (FastAPI scaffold â€” START, no blockers) â†’ CDX-003 (schema + seed) â†’ CDX-004 (endpoints) â†’ CDX-005 (VPS deploy, needs Arham access) â†’ CDX-008 (Calorie Engine + RAG, after CDX-003); CDX-006 (YOLOv8, parallel, needs Kaggle URLs); CDX-007 (MiDaS, last/minimal).
4. **Claude (Phase 5):** once the API is live, wire `src/lib/api.ts` + update the Results screen to show the real pipeline (recognition â†’ portion â†’ grounded calorie breakdown + "why" + sources); keep Gemini as fallback until proven. Then SDS material + demo prep.
5. **Open:** Google OAuth dev-build need for the live demo vs. email/password through Expo Go.

## Plan reference

Full plan at `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`.
