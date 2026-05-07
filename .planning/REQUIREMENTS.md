---
milestone: v1.0
name: P1 Mid
created: 2026-05-07
---

# Milestone v1.0 (P1 Mid) Requirements

Three categories: **AUTH** (Firebase auth & user mgmt), **UI** (capture + results polish), **API** (FastAPI + Postgres food DB).

REQ-ID format: `[CATEGORY]-[NUMBER]`. Mapped to phases in `ROADMAP.md`.

---

## v1.0 Requirements

### AUTH — Authentication & User Management

- [ ] **AUTH-01**: User can sign up with email + password and lands on home screen on first sign-in
- [ ] **AUTH-02**: User can sign in with email + password and persistent session restores across restarts
- [ ] **AUTH-03**: User can sign in with Google in two taps (OAuth via Firebase)
- [ ] **AUTH-04**: User can reset password via email link
- [ ] **AUTH-05**: User can sign out and session ends across the app
- [ ] **AUTH-06**: Firestore `users/{uid}` document is created on first sign-in with onboarding state flag
- [ ] **AUTH-07**: Unauthenticated users are redirected to `/welcome` from any auth-gated route

### UI — Capture & Results

- [ ] **UI-01**: User can capture a food photo via in-app camera with permission flow + denied-state explainer
- [ ] **UI-02**: User can upload a food photo from gallery as a fallback
- [ ] **UI-03**: User sees a loading skeleton on Results screen while inference runs (target <5s p95 on 4G)
- [ ] **UI-04**: User sees calories (Instrument Serif hero numeric) and 4 macros (protein/carbs/fat/fiber) on Results screen
- [ ] **UI-05**: User sees confidence pill on Results card; if confidence <70%, alternatives list is shown (FR13)
- [ ] **UI-06**: User can save Results to history with one tap; entry appears in Firestore `users/{uid}/food_logs`
- [ ] **UI-07**: All P1 Mid surfaces (Auth, Capture, Results) use the 70/20/10 design tokens defined in `docs/DESIGN.md`
- [ ] **UI-08**: All P1 Mid surfaces use Geist Sans (UI/body) + Instrument Serif (hero numerics) loaded via `@expo-google-fonts`
- [ ] **UI-09**: Default accent is green `#1BAD66`; tokens for gold + coral exist but no settings UI yet
- [ ] **UI-10**: Medical disclaimer footer renders on Results screen

### API — Food Database Service

- [ ] **API-01**: FastAPI service deployed to Render free tier with HTTPS and `/healthz` returning 200
- [ ] **API-02**: PostgreSQL schema covers `foods`, `food_aliases`, `nutrition_facts`, `portion_sizes`, `modifier_constants`
- [ ] **API-03**: Database is seeded with v1 dataset (`pakalorie_food_database.json`, 100+ dishes) + USDA FoodData Central augmentation; `SELECT COUNT(*) FROM foods` ≥ 150
- [ ] **API-04**: `POST /recognize` accepts multipart image, calls Gemini Vision server-side, returns `{food_label, confidence, alternatives[]}`
- [ ] **API-05**: `GET /foods/search?q=` returns fuzzy matches across English + Roman Urdu aliases (Postgres `pg_trgm`)
- [ ] **API-06**: `GET /foods/{id}` returns full nutrition + portion variants
- [ ] **API-07**: `POST /foods/{id}/nutrition` accepts `{portion, modifiers[]}` and returns adjusted macros via `Final = Base × Scale + ModifierConstant`
- [ ] **API-08**: All Gemini API calls are server-side; no API keys ship in the mobile bundle
- [ ] **API-09**: Mobile app `src/lib/api.ts` is wired to the deployed Render URL; end-to-end capture → results works on a real Android device

### DEMO — Acceptance & Delivery

- [ ] **DEMO-01**: Fresh install on Arham's Android via EAS dev build; sign-up + Google sign-in both succeed
- [ ] **DEMO-02**: Live demo flow (capture chicken karahi → results in <5s → save to history) runs end-to-end
- [ ] **DEMO-03**: Backup demo video recorded and stored locally + on Drive
- [ ] **DEMO-04**: README at repo root with architecture diagram, env-var list, run instructions
- [ ] **DEMO-05**: `/gsd-verify-work` run against milestone before demo day; no failing acceptance criteria

---

## Future Requirements (deferred)

### P1 Final (v1.1) — End August 2026
- YOLOv8 custom detector replaces Gemini Vision in `/recognize`
- Ustad chatbot v1 (Gemini 3 Flash, 70/30 EN/UR)
- Hydration tracking UI
- Apple Sign-In on top of Firebase Auth
- Dark mode runtime switching

### P2 Mid (v1.2) — End November 2026
- MiDaS monocular depth estimation for portion size
- Google Fit + Apple HealthKit sync
- Onboarding visual redesign

### P2 Final (v1.3) — End February 2027
- Quantized on-device inference fallback (no-network mode)
- Wear OS / Apple Watch surface
- Final accessibility pass + polish

---

## Out of Scope (explicit exclusions for v1.0)

| Excluded | Reason |
|---|---|
| YOLOv8 model training | Per FYP doc, scoped to P1 Final |
| MiDaS depth estimation | Per FYP doc, scoped to P2 Mid |
| Google Fit / HealthKit | Per FYP doc, scoped to P2 Mid |
| Ustad coach chatbot | Per FYP doc, scoped to P1 Final |
| Restaurant discovery (Google Places) | Out of FYP doc; deprioritized |
| Push notifications | No infra in P1 Mid; pushed to P1 Final at earliest |
| iOS build | Apple Developer cert not purchased; Android-only demo |
| Dark mode (runtime) | Tokens defined; UI wiring deferred to June UI sprint |
| Liquid glass / blur tab bar | Deferred to June UI sprint |
| Animations / micro-interactions | Deferred to June UI sprint |
| Onboarding visual redesign | v2's onboarding carries over as-is |
| Accent picker UI | Default green for P1 Mid; settings UI later |

---

## Traceability

Filled by `ROADMAP.md` — every REQ-ID maps to exactly one phase.
