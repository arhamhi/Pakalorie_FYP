---
milestone: v1.0
name: P1 Mid
created: 2026-05-07
total_phases: 4
total_requirements: 31
coverage: 100%
---

# Milestone v1.0 (P1 Mid) Roadmap

**4 phases** | **31 requirements mapped** | All covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|---|---|---|---|
| 1 | Foundation & Auth | Fork v2, Firebase migration, auth UI shipped | AUTH-01..07 + UI-09 (accent default) | 5 |
| 2 | Capture/Results UI Polish | Geist + Instrument Serif + 70/20/10 tokens applied to 3 surfaces | UI-01..10 | 5 |
| 3 | FastAPI + Postgres Backend | Service deployed, seeded, all 4 endpoints live | API-01..09 | 5 |
| 4 | Demo & Acceptance | EAS build on real Android, demo script, README, verification | DEMO-01..05 | 4 |

---

## Phase Details

### Phase 1: Foundation & Auth (~Week 1, May 8–14)

**Goal:** Repo and tooling solid; Firebase Auth + Firestore replacing Supabase; auth-gated routes redirect cleanly.

**Requirements:**
- AUTH-01 (signup), AUTH-02 (login), AUTH-03 (Google OAuth), AUTH-04 (password reset), AUTH-05 (signout), AUTH-06 (Firestore user doc), AUTH-07 (auth-gated routes)
- UI-09 (default accent = green)

**Success criteria:**
1. Firebase project `pakalorie-fyp` exists; email/password + Google providers enabled
2. `src/contexts/AuthContext.tsx` rewritten using Firebase SDK; v2's API contract preserved so consumer screens don't break
3. `app/(auth)/{welcome,login,signup,forgot-password}.tsx` all build and navigate correctly
4. New user signup creates a `users/{uid}` Firestore doc with `onboarding_complete: false`
5. Force-quit + relaunch keeps user signed in (token refresh confirmed)

**Codex parallel track:** CDX-001 (Firestore migration spec for non-auth collections — see `../.handoff/TO_CODEX.md`)

---

### Phase 2: Capture/Results UI Polish (~Week 2, May 15–21)

**Goal:** The 3 visible-to-supervisor surfaces feel premium. Tokens, fonts, type scale, components all consistent.

**Requirements:**
- UI-01..10

**Success criteria:**
1. `src/constants/{fonts.ts,spacing.ts}` created; `tailwind.config.js` extended with the 70/20/10 token system
2. Geist Sans + Instrument Serif load via `@expo-google-fonts` and render on Auth, Capture, Results without FOIT/FOUT regressions
3. Capture screen: camera permission flow + denied-state card + gallery fallback all work
4. Results screen: hero numeric (Instrument Serif), 4-card macro grid, confidence pill, alternatives when <70%, save CTA, disclaimer footer all render correctly
5. Save-to-history writes a Firestore log doc and the entry appears in v2's existing history surface

**Codex parallel track:** Phase 2 is mostly Claude Code work; Codex starts CDX-002 (FastAPI scaffold) at end of Week 2.

---

### Phase 3: FastAPI + Postgres Backend (~Week 3, May 22–28)

**Goal:** Backend service deployed and reachable from the mobile app over HTTPS. End-to-end capture → results runs against our infra (not Supabase + direct Gemini).

**Requirements:**
- API-01..09

**Success criteria:**
1. Postgres schema migrated via Alembic; seed script populates ≥150 foods (v1 dataset + USDA augmentation)
2. All 4 P1 Mid endpoints (`/recognize`, `/foods/search`, `/foods/{id}`, `/foods/{id}/nutrition`) plus `/healthz` documented in OpenAPI
3. FastAPI service deployed to Render free tier; HTTPS + env vars (`DATABASE_URL`, `GEMINI_API_KEY`, `CORS_ORIGINS`) configured
4. `src/lib/api.ts` typed client wired to deployed URL; mobile app no longer calls Supabase or Gemini directly
5. End-to-end smoke test: snap chicken karahi on Android device → results screen shows real macros from our backend

**Codex track (primary owner):** CDX-002, CDX-003, CDX-004, CDX-005 — see `../.handoff/TO_CODEX.md`

---

### Phase 4: Demo & Acceptance (~Week 4, May 29 – end of month)

**Goal:** Bug bash, EAS build on Arham's daily Android, rehearsed 90-second demo, supervisor-ready.

**Requirements:**
- DEMO-01..05

**Success criteria:**
1. EAS dev build installed on Arham's Android; clean install works for a fresh test account
2. 90-second demo script (signup → Google → capture → result → save → history) runs end-to-end live
3. Backup screen-recorded video stored on local + Drive
4. Repo `README.md` includes architecture diagram, env-var list, run instructions
5. `/gsd-verify-work` shows zero failing acceptance criteria across all 31 requirements

---

## Coverage Validation

Every REQ-ID in `REQUIREMENTS.md` maps to exactly one phase:
- Phase 1: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, UI-09 (8)
- Phase 2: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-10 (9)
- Phase 3: API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08, API-09 (9)
- Phase 4: DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05 (5)

**Total: 31 / 31 requirements mapped. 100% coverage.**

---

## Numbering note

Phases reset to **1** for this milestone (project's first GSD milestone). Future milestones (v1.1 onward) continue numbering from where v1.0 ended (Phase 5 onwards) unless `--reset-phase-numbers` is passed.
