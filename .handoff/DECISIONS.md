# DECISIONS — append-only architectural decisions log

Format: `## YYYY-MM-DD — <decision title>` then the decision, the rationale, and the alternatives we rejected.

---

## 2026-05-07 — Stack: Firebase Auth + Firestore + FastAPI + PostgreSQL

**Decision:** Authentication and user-data plane uses Firebase (Auth + Firestore). Food/nutrition data uses our own FastAPI service backed by PostgreSQL. Image recognition for P1 Mid is a thin Gemini Vision wrapper inside FastAPI; YOLOv8 takes over in P1 Final.

**Why:** FYP Overleaf doc commits us to Firebase + FastAPI + PostgreSQL. Doc compliance > engineering elegance for university grading.

**Rejected:** (a) keep v2's Supabase end-to-end — would deviate from doc and trigger supervisor questions; (b) full Firestore for everything — Firestore is bad at fuzzy text search and joining nutrition × portion data.

---

## 2026-05-07 — Light-mode-only for May; dark mode in June UI sprint

**Decision:** P1 Mid ships light mode only across the 3 in-scope surfaces (auth, capture, results). Token system built dark-ready from day one.

**Why:** Hard 3–4 week timeline. Dark mode polish is one full sprint of QA on its own. Doing both halfway is worse than doing one well.

**Rejected:** "Just keep v2's existing dark mode and add light." — v2's dark mode wasn't designed against the new 70/20/10 token system; would need rework anyway.

---

## 2026-05-07 — Geist Sans + Instrument Serif

**Decision:** Geist Sans (UI/body/headings), Instrument Serif (hero numerics on Results screen). Both via `@expo-google-fonts`. Both OFL-licensed and free.

**Why:** Geist is Vercel's modern grotesque — feels Apple-adjacent without being literal SF copies. Instrument Serif gives the hero calorie number an editorial moment that Cal AI uses to differentiate. Both load cleanly via Google Fonts CDN.

**Rejected:** IBM Plex Mono (v2's pick) — too engineering-flavored for the consumer health vibe. SF Pro — not freely redistributable. Inter — too generic.

---

## 2026-05-07 — Codex (backend) + Claude (UI/general) split via .handoff/

**Decision:** Backend (FastAPI, Postgres, Firebase migration spec, infra) goes to Codex CLI. UI, mobile screens, design system, and Arham-authored docs stay with Claude Code. Coordination via `.handoff/{STATE,TO_CODEX,TO_CLAUDE,DECISIONS}.md`.

**Why:** Backend is mostly mechanical translation of specs → code (Codex's sweet spot, cheaper run cost). UI is taste + iteration (Claude's sweet spot). Splitting protects monthly Claude usage budget.

**Rejected:** Single tool for everything — more expensive, more context bloat per session.

---

## 2026-05-07 — GSD plugin used selectively, not on autopilot

**Decision:** Use GSD only for `/gsd-new-milestone` (once at start), `/gsd-plan-phase` (per module), `/gsd-verify-work` (before checkpoints), `/gsd-extract-learnings` (after phases). Skip `/gsd-execute-phase` (usage-hungry) — execution happens manually via Claude+Codex.

**Why:** GSD is opinionated and consumes a lot of model usage per phase. Selective use captures the planning-discipline value without burning the monthly quota mid-sprint.

**Rejected:** Full GSD adoption — quota risk during cash crunch.

---

## 2026-05-07 — Repo name: `Pakalorie_FYP`

**Decision:** GitHub repo named `Pakalorie_FYP` (matches the Stitch design project name). Pushed to https://github.com/arhamhi/Pakalorie_FYP (private).

**Why:** Keeps repo name aligned with the Stitch project so cross-references are obvious. Underscore separator distinguishes from any pakalorie folder Arham has lying around.

**Rejected:** `FYP-Pakalorie` (initial idea — replaced for naming consistency with Stitch); `pakalorie` (collision risk).

---

## 2026-05-08 — Firebase via @react-native-firebase (native), not JS SDK

**Decision:** Use `@react-native-firebase/{app,auth,firestore}` (native modules) over the JS `firebase` SDK. Google Sign-In via `@react-native-google-signin/google-signin`. Required `expo-dev-client` + EAS dev build — Expo Go path is dropped.

**Why:** FYP demo runs on a real Android device via EAS dev build anyway. Native Firebase SDK gives proper auth persistence, native Google Sign-In flow (no AuthSession redirect dance), and matches what supervisors expect when they look at the code. JS SDK on RN has known issues with auth persistence and forces the OAuth redirect flow.

**Rejected:** Firebase JS SDK (`firebase` npm package) — cleaner Expo Go story but breaks our requirement for native Google Sign-In and triggers persistence warnings on RN.

**Cost:** Lose the ability to test in Expo Go from now on. All future testing requires `expo run:android` or an EAS dev build install.

---

## 2026-05-08 — Profile type relocated to src/types/profile.ts

**Decision:** Created `src/types/profile.ts` with a Firestore-shaped Profile interface. `src/types/database.ts` now re-exports it (backwards-compat with v2 screens that import from there).

**Why:** Supabase-generated `Tables<'profiles'>` was tied to the old schema. New fields (`onboarding_complete`, `accent_preference`, `is_premium`) needed adding without touching the auto-generated Supabase types file.

**Rejected:** Editing `database.ts` directly — that file is auto-generated; manual edits would be overwritten if anyone ever ran the Supabase type generator again.

---

## 2026-05-08 — iOS added to P1 Mid scope (was Android-only)

**Decision:** Both Android and iOS now ship as part of P1 Mid demo. Android remains the primary demo target (Arham's daily-driver phone, EAS dev build). iOS ships via EAS cloud build for simulator at minimum; physical iPhone via TestFlight is best-effort and gated on Apple Developer account purchase ($99/yr) — purchase deferred to late May.

**Why:** App Store reach matters for the FYP narrative even if we never submit. Adding iOS now (when the codebase is small and Firebase config is being set up anyway) costs less than adding it in P1 Final after layouts have drifted Android-first. EAS cloud builds don't require a Mac, removing the historical blocker.

**Cost:** +2 acceptance criteria (DEMO-06, DEMO-07), one extra Firebase Console step (iOS app registration + GoogleService-Info.plist), iOS-specific URL scheme wiring in `app.json`, and the deferred $99 Apple Dev account spend.

**Rejected:** Keeping iOS out until P2 — would require a separate iOS port pass when Apple Sign-In and HealthKit work starts in P1 Final; cleaner to take the hit now.

---

## 2026-05-08 — Apple Sign-In + Phone OTP stubbed, not removed

**Decision:** AuthContext keeps `signInWithApple`, `signInWithPhone`, `verifyOtp` in its public API but they throw `not-implemented` errors. Methods will be filled in for P1 Final / P2.

**Why:** Preserves the v2 API contract so any existing consumer screens that reference these methods don't fail to compile. Throwing instead of silently returning makes the gap obvious if a screen tries to use them.

**Rejected:** Deleting the methods entirely — would force a sweep of every consumer screen for P1 Mid which is out of scope.
---

## 2026-05-07 - Repo-level agent operating instructions

**Decision:** Add standing instructions for both coding agents: `AGENTS.md` for Codex, `.agents/CODEX.md` as the explicit Codex lane pointer, `CLAUDE.md` as the root Claude pointer, and `.claude/CLAUDE.md` for Claude Code.

**Why:** Pakalorie FYP is now a two-agent workflow. Every fresh session must start from `.handoff/STATE.md`, use the correct queue file, respect ownership boundaries, and update handoff files before ending. This prevents Claude and Codex from drifting or solving the same problem twice.

**Rejected:** Keeping the workflow only in chat memory. Chat context is fragile across sessions; repo-level instructions make the operating rhythm durable.

---

## 2026-05-19 - Reverse native Firebase; Expo Go first

**Decision:** Replace `@react-native-firebase/{app,auth,firestore}` and native Google Sign-In with the Firebase JS SDK (`firebase`) plus `expo-auth-session`. Remove `expo-dev-client`, `expo-build-properties`, native Firebase config plugins, and the Google Sign-In config plugin from `app.json`.

**Why:** Arham needs the old fast loop back: `npx expo start` -> QR -> Expo Go on Android/iPhone. The native-module path was technically cleaner for production Google Sign-In, but it blocked day-to-day FYP demo velocity.

**Scope:** Email/password auth and Firestore profiles are the Expo Go acceptance path. Google OAuth remains code-wired through AuthSession, but Expo Go cannot reliably test OAuth with the app's custom scheme; verify Google in a development or production build if it is needed for the live demo.

**Rejected:** Continuing native Firebase as the default. It forces `expo run:*` or EAS dev builds for every device smoke-test, which is too slow for the May P1 Mid timeline.

---

## 2026-05-19 - Force Firebase Auth through browser ESM in Expo Go

**Decision:** Runtime Auth imports go through `src/lib/firebaseAuth.ts`, which directly imports Firebase Auth's browser ESM bundle. `src/lib/firebase.ts` still uses `firebase/app` and `firebase/firestore`, but Auth no longer imports the React Native/CJS Auth bundle in Expo Go.

**Why:** Metro resolved `firebase/app` and `firebase/auth` through different Firebase app/component registries. That crashed Expo Go at startup with `Component auth has not been registered yet`, then Expo Router reported misleading missing-default-export warnings for every route that imported AuthContext.

**Scope:** Email/password auth and credential sign-in stay pure JS and Expo Go-compatible. Auth persistence is still backed by AsyncStorage via a local persistence class.

**Rejected:** Returning to native Firebase/dev-client as the default. That would fix the registry mismatch but would again break Arham's fast `npx expo start` -> Expo Go QR workflow.

---

## 2026-06-03 — Milestone map corrected: P1 Final is the current target (cumulative 50%)

**Decision:** Correct the milestone understanding. The FYP is **12 modules = 100%, across 4 milestones (P1 Mid, P1 Final, P2 Mid, P2 Final), 3 modules each, 25% per milestone.**

- **P1 Mid (25%) — SUBMITTED at the 7th-sem midterm:** Authentication, Core Mobile UI (Capture/Results), Food Recognition (YOLOv8 — delivered as a Gemini-Vision stub per the original plan's "Gemini now, YOLOv8 in P1 Final" call).
- **P1 Final (25%, cumulative 50%) — THE CURRENT TARGET. 7th-semester FINAL, due before July 2026:**
  1. Food Database API (FastAPI + PostgreSQL)
  2. Volume & Depth Estimation (MiDaS) — minimal effort, accept partial marks (absolute volume→grams from one uncalibrated photo is unreliable; deliver a relative depth map + a documented limitation).
  3. Calorie Calculation Engine + RAG
- **P2 Mid / P2 Final — 8th semester, later:** Model Optimization & Quantization, Data Viz + Calorie Compensation, Real-Time Inference Pipeline / Urdu Localization, Health Data Sync, AI Chat Coach.

**Carryover into this push:** Real YOLOv8 training (the midterm used a Gemini stub). The P1 Final pipeline — recognize dish → look up Food DB → compute calories via the engine — needs a real recognition model, so YOLOv8 training is a foundation task alongside the three graded P1 Final modules.

**Impact:** The Codex FastAPI queue (CDX-002..005, Food DB API) is now **ACTIVE and foundational** (the calorie engine reads from it). New Codex tasks added for MiDaS (CDX-007) and Calorie Engine + RAG (CDX-008). `.planning/*` to be re-baselined around a **P1 Final** milestone.

**Supersedes:** an earlier (incorrect) 2026-06-03 framing that treated P1 Mid as the 50% target with YOLOv8 as the only remaining work. P1 Mid was the 25% midterm and is already submitted.

---

## 2026-06-03 — YOLOv8 classification (not detection) for P1 Mid; Gemini stays the live app path

**Decision:** The P1 Mid "Food Recognition — YOLOv8" deliverable is a **YOLOv8 classification model** (`yolov8*-cls`) trained on the Kaggle desi-food datasets (folder-per-dish image classification). It is delivered as a Colab notebook + trained weights + an evaluation report (top-1/top-5 accuracy, confusion matrix, sample predictions on our own photos). It is **not** wired into the mobile app for P1 Mid — the app keeps using the existing Gemini Vision path for the live capture→results demo.

**Why:**
- Detection mode needs bounding-box annotations. The Kaggle datasets are classification (no boxes), and we have no labeling pipeline or time to build one before end of June. Classification needs zero boxes — train directly on the folders.
- For a single-dish photo (the app's core flow), classification is sufficient and produces real, reportable ML metrics.
- Keeping Gemini live means the working demo is never at risk while the model is being trained/evaluated. Replacing Gemini with our own model served via FastAPI is a coherent P1 Final story.
- Own photos become a held-out test set (we know the ground truth), giving a qualitative results section with no annotation work.

**Scope for P1 Mid:** trained `.pt` (+ ONNX export), metrics table, model card, demo inference script/notebook. Multi-dish bounding-box detection is explicitly P1 Final, gated on building a labeled detection set (Roboflow/CVAT).

**Rejected:** (a) YOLOv8 detection now — blocked by the labeling problem and timeline; (b) wiring YOLOv8 into the RN app for P1 Mid — couples a working demo to in-progress ML on a tight deadline; on-device inference is itself a P2 Mid module (Real-Time Inference Pipeline).

---

## 2026-06-03 — Deploy on Hostinger VPS via Docker, not Render free tier

**Decision:** The FastAPI service + PostgreSQL deploy as Docker containers on Arham's existing **Hostinger KVM 2 VPS** (Ubuntu 24.04, 2 vCPU / 8 GB RAM / 100 GB disk, root, IP `179.61.246.154`, host `srv987636.hstgr.cloud`, paid through 2026-09-01, already running n8n in Docker at ~16% memory). Postgres runs as a self-hosted Docker container on the same box (no managed Neon/Supabase Postgres needed). This supersedes CDX-005's "Render free tier + Neon/Supabase" target.

**Why:**
- Render free tier cold-starts after 15 min idle. P1 Final defense now requires a **live device demo** (Arham confirmed), so a cold-start mid-demo is unacceptable. The VPS is always-on.
- Already paid for; $0 marginal cost; root + Docker + 91 GB free disk + 8 GB RAM with only n8n co-resident. Plenty of headroom for FastAPI + Postgres + CPU-only MiDaS inference.
- We control Postgres directly (pgvector for RAG, pg_trgm for fuzzy search) instead of fighting free-tier connection-pool limits.

**Scope / guardrails:**
- Shared box with a public n8n. Namespace our containers; put Postgres on a private Docker network with **no public port**; expose only FastAPI behind the existing reverse proxy (n8n uses one on the `hstgr.cloud` domain — inspect before adding a `pakalorie`/`api` subdomain). HTTPS via the existing proxy's certs.
- Secrets via env/`.env` on the box, never committed.
- YOLOv8 **training** stays on Colab free T4 (no GPU on the VPS). Trained `.pt`/`.onnx` inference on CPU is fine for demo throughput. MiDaS small runs CPU-only (slow but acceptable for the minimal scope).
- Deploy execution needs Arham's SSH (root) or a provisioned deploy user. Codex specs the Docker/compose + reverse-proxy config; Arham runs the deploy or grants access. Pick the API subdomain with Arham before CDX-005.

**Rejected:** Render free + Neon/Supabase — cold-start kills the live demo and adds vendors for no benefit now that a capable always-on box exists.

---

## 2026-06-03 — Food DB seed: 30 curated desi dishes + USDA augmentation (v1 JSON is 30, not "100+")

**Decision:** Seed the Food DB from the v1 JSON (`C:\Users\Arham\OneDrive\Desktop\AI Work\Pakalorie\pakalorie_food_database.json`), which actually contains **30 dishes** (not the "100+" the earlier handoff docs claimed). Treat these 30 as the **curated Pakistani core**, then bulk-import **USDA FoodData Central** global items to clear the ≥150-row target for breadth. Grow the desi set opportunistically later; do not block P1 Final on expanding it.

**v1 JSON schema (confirmed):** `{version, last_updated, dishes:[{id, name_en, name_ur, category, base_unit, portions:[{label, weight, kcal, p, c, f}], modifiers:{<name>: <additive_kcal_int>}}]}`. Notes for the schema design:
- Macros are **protein/carbs/fat only — NO fiber**. The Results screen (P1 Mid UI-04) shows a fiber card; fiber must be nullable/optional in the schema and the UI must tolerate `null` (don't fabricate fiber). USDA rows do carry fiber.
- Portions are **labeled** (e.g. "Standard Bowl", "weight" in grams), often a single portion per dish — they are NOT a fixed small/medium/large enum. `POST /foods/{id}/nutrition` must reference actual portion labels/ids from the data, not a hardcoded small/medium/large set.
- Modifiers are **additive kcal constants** (e.g. `extra_tarri: 60`, `nalli: 45`), matching `Final = Base + ModifierConstant` (the "× Scale" comes from portion weight). No per-modifier macro deltas in v1.

**Why:** The FYP's whole differentiator is the "Desi Food Gap" — 30 correctly curated Pakistani dishes with real portions + modifiers is more defensible to the supervisor than an inflated count. USDA provides honest breadth without faking desi coverage.

**Rejected:** (a) Claiming 150 desi dishes we don't have — dishonest, and the report wouldn't survive scrutiny. (b) Dropping the 150 target to desi-only ~30-50 — acceptable but the FYP doc implies a real database; USDA augmentation is free and standard.

---

## 2026-06-03 — `.planning/` re-baselined to milestone v1.1 (P1 Final)

**Decision:** Re-baselined `.planning/{PROJECT,REQUIREMENTS,ROADMAP,STATE}.md` from the submitted **v1.0 (P1 Mid)** milestone to **v1.1 (P1 Final)**: 3 graded modules (Food Database API, Volume & Depth / MiDaS, Calorie Engine + RAG) + the YOLOv8 real-training carryover + the mobile-wiring/demo/docs work that a live defense requires. P1 Mid requirements (AUTH/UI) are recorded as submitted, not deleted. Hand-edited (no `/gsd-*`, to protect quota), per the session brief.

**Why:** The planning docs still described P1 Mid as the active in-progress milestone with a Render/Neon backend. The corrected milestone map (2026-06-03) plus the VPS and live-demo decisions made them stale. Single source of truth had to match reality before dispatching Codex.

**Rejected:** Running `/gsd-new-milestone` — burns quota during a cash crunch; the re-baseline is mechanical enough to hand-edit.

---

## 2026-06-03 - Backend package manager: uv

**Decision:** Use `uv` for the new `backend/` Python project. `backend/pyproject.toml` defines runtime and dev dependencies, and `backend/uv.lock` pins the resolved environment.

**Why:** `uv` is already installed on Arham's machine, is fast enough for repeated backend checks, and keeps the Python lane separate from the existing Expo app.

**Rejected:** Poetry. It would work, but it is not currently needed and would add another tool path for this repo.

---

## 2026-06-03 - Backend branch strategy: one P1 Final backend branch

**Decision:** Use a single branch, `cdx/p1final-foodbackend`, for CDX-002, CDX-003, CDX-004, and CDX-008 implementation work.

**Why:** These tasks are tightly coupled: the schema, seed, endpoints, and calorie engine depend on the same food database contract. One branch keeps the API contract visible for Claude and avoids multiple half-integrated PRs.

**Rejected:** One branch per task for this run. That is cleaner for isolated tasks, but here it would create extra coordination overhead without improving the final demo path.

---

## 2026-06-03 - USDA subset: Foundation Foods 04/2026 filtered extract

**Decision:** Use a committed filtered extract of 130 rows from USDA FoodData Central Foundation Foods 04/2026, generated from the official CSV archive by `backend/scripts/build_usda_extract.py`.

**Why:** The full USDA dump is too large to commit. A small real extract clears the >=150 food-row target when combined with the 30 desi rows, while keeping provenance and reproduction instructions in the repo.

**Rejected:** Fabricating generic global food rows or committing the full USDA archive. Fabricated rows would weaken the report; the full archive is unnecessary repo weight.

---

## 2026-06-03 - Calorie retrieval: pg_trgm first, pgvector enabled for later embeddings

**Decision:** Implement the first retrieval layer with Postgres `pg_trgm` fuzzy matching over English, Urdu, and alias text, while enabling the `vector` extension in the baseline migration for future embedding retrieval.

**Why:** `pg_trgm` is deterministic, simple, and enough for the current dish-label to nutrition-row lookup. It avoids adding embedding generation risk before the Food DB API is stable. The database is still pgvector-ready for the later RAG upgrade.

**Rejected:** Full pgvector embeddings in this first pass. It adds model/API dependency and seeding complexity before the local DB smoke has been completed.

---

## 2026-06-03 - Backend verified on a live VPS Postgres; provisioning + surgical fixes (Claude)

**Context:** Local Docker Desktop kept OOM/502-crashing, so the Codex-built backend had never touched a real Postgres (all 9 tests were mocks/schema). Arham asked Claude to review + fix + prove it this session, overriding the usual Claude=mobile / Codex=backend split for this run only.

**Decisions:**

- **Database = a dedicated pgvector Postgres on the Hostinger VPS, now (not local Docker).** Provisioned `pakalorie-postgres` (`pgvector/pgvector:pg16`) on its own Docker network + named volume, **bound to `127.0.0.1:5432` only** (never public; n8n shares the box), strong generated password (not `pakalorie/pakalorie`), `--restart unless-stopped`. The laptop reaches it through an SSH tunnel for dev/verify. n8n + Traefik confirmed unaffected. We stopped fighting local Docker. *Why:* the box is always-on and is where we deploy anyway, so this de-risks CDX-005 (the seed + schema are proven before the public deploy). *Rejected:* keep retrying local Docker Desktop (unstable); a managed Postgres (unnecessary, the VPS box is fine).

- **Retrieval stays `pg_trgm`; both search paths share one threshold constant.** Unified the divergent trigram floors (retrieval `0.12` vs search `0.15`) into a single `TRIGRAM_SIMILARITY_THRESHOLD = 0.12` (`app/core/constants.py`) so `/foods/search` and `/calories` retrieval agree on what counts as a match. The `vector` extension stays enabled (reserved for future embeddings) but **no dead `vector` column was added.** Extends the earlier pg_trgm-first decision. *Why 0.12:* better recall for transliteration variants; `ILIKE` + score-ordering keep precision; verified Nihari still ranks #1 (score 1.0).

- **Renamed `nutrition_facts.per_g` -> `portion_weight_g`.** The column stores the portion's weight in grams, not a per-gram value; the old name was actively misleading in a graded SDS. Safe rename (no DB existed yet): models, baseline migration, seed, and tests. Also added `server_default='grams'` to `foods.base_unit` so raw-SQL inserts don't fail (the ORM was hiding it).

- **USDA rows are labeled as raw-ingredient reference, not dishes.** `source` is returned by `/foods/{id}` and `/foods/search`. `backend/docs/DATA_NOTES.md` documents: `desi_v1` (30 curated dishes) = the product core and the only thing the live demo uses; `usda` (130 Foundation Foods, per-100g raw ingredients) = breadth/reference only. Honest framing for the report. *Rejected:* dropping USDA or pretending they are dishes.

- **Fixed a Gemini truncation bug.** `gemini-3-flash-preview` is a thinking model and thinking tokens count against `maxOutputTokens`, so the grounded JSON got truncated (`finishReason=MAX_TOKENS` -> unparseable -> 502 on `/calories` and `/recognize`). `generate_json` now requests native `application/json` output and defaults `thinkingBudget=0` (it only ever wants a JSON object). The model name itself was correct and matches the mobile client. *Rejected:* just bumping `maxOutputTokens` (thinking is greedy; capping it is deterministic and faster).

- **Added a live-DB integration suite** (`backend/tests/test_integration.py`, marker `integration`) that auto-skips when no DB is reachable, so the fast unit run still works with no DB. This is the safety net the backend lacked: real seed counts, search, detail + fiber semantics, modifier math + 422s, grounded fallback.

**Verified:** `alembic upgrade head` on the live DB; seed = `foods=160, desi_v1=30, usda=130` (idempotent); every endpoint smoke-tested incl. `gemini_grounded` and `local_grounded_fallback` paths and both 422s; `ruff` clean; `pytest` green (9 unit + 8 integration). Real-desi-photo recognition verified 2026-06-04: `test_food.webp` -> `Haleem` @ 0.98 with sensible alternatives (Dal Gosht, Hareesa, Khichra).

---

## 2026-06-29 — Recognition engine switch: server-side ONNX, Gemini default, YOLO as a demo toggle

**Decision:** Add an optional in-app "recognition engine" switch — **Gemini (default / recommended)** vs **our trained YOLOv8 model**. The YOLO model runs **server-side** in the existing FastAPI backend via `onnxruntime`, exposed through an `engine` parameter on `POST /recognize`. On-device inference is NOT done now.

**Why:**
- The backend already runs an ONNX model in production (MiDaS, `app/services/depth.py`), so loading `best.onnx` reuses installed machinery — low risk, no new infra.
- On-device inference is the documented **P2** path: it needs a native ML runtime + a custom dev build, which breaks the Expo Go `npx expo start` → QR workflow we demo with.
- The switch is a **demonstration of our own model and the accuracy/cost tradeoff** (a strong defense talking point), NOT a better recognizer: YOLO is 58.5% top-1 and only knows its 217 classes, so Gemini stays default. Both engines return the **same `RecognitionResponse` shape** so the app stays engine-agnostic.

**Scope:** new `CDX-009`. **Not required for any graded module** — the trained model is already a complete deliverable; this is pure demo polish.

**Rejected:** (a) on-device ONNX/TFLite now — P2, breaks Expo Go; (b) making YOLO the default — visibly worse than Gemini and limited to 217 classes.

**Implementation notes (2026-06-29, done + deployed):**
- **Class names extracted from `best.onnx` metadata, not `best.pt` via ultralytics.** The spec said load `YOLO('best.pt').names`, but unpickling a YOLO `.pt` requires the full torch+ultralytics stack (~2 GB) for a one-time dict read. Ultralytics writes the same `names` map into the ONNX export metadata, and the metadata order is the `output0` logit order, so reading it from the exact file the server loads (`ml/scripts/extract_class_names.py`) is both lighter and *more* guaranteed to be index-aligned. Count cross-checked (217) against `ml/reports/per_class_recall.csv`.
- **`best.onnx` already softmaxes.** Its output is a probability vector (sums to 1), so the service uses it directly; re-softmaxing flattened it to near-uniform. A guard re-softmaxes only if a future export emits raw logits. Empirically: `test_food.webp` → Haleem @ 0.57 (vs Gemini @ 0.98) — the intended "our model is real but less accurate" demo story.
- **Deploy:** artifacts are git-committed (unlike MiDaS, downloaded on-box), so deploy is `git pull` + copy into the host-mounted `backend/models/yolo/` + rebuild. No `.env` change.
