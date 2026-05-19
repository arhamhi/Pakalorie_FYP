---
milestone: v1.0
name: P1 Mid
status: in_progress
phase_current: 1
phase_total: 4
progress:
  requirements_total: 33
  requirements_done: 0
  phases_done: 0
last_updated: 2026-05-19
---

# STATE — Pakalorie FYP (v1.0 P1 Mid)

## Current Position

Phase: **Phase 1 — Foundation & Auth / Phase 2 — Capture & Results** (auth UI + scan polish shipped; smoke-test pending)
Plan: `.planning/ROADMAP.md`
Status: Native Firebase path reversed. The app now uses the Firebase JS SDK so day-to-day testing is back to `npx expo start` → Expo Go QR on Android/iPhone. Email/password + Firestore profile work is the Expo Go target; Google OAuth is wired through AuthSession but must be verified in a development/production build.
Last activity: 2026-05-19 — Codex converted auth from native Firebase modules to Firebase JS SDK and then fixed Expo Go runtime auth initialization to use Firebase's React Native persistence helper.

## Accumulated Context

### Decisions
See `../.handoff/DECISIONS.md` for full log. Key calls:
- Firebase Auth + Firestore + FastAPI + Postgres (per FYP doc)
- Geist Sans + Instrument Serif fonts
- Codex (backend) + Claude (UI) split
- GSD selective use (plan / verify only)
- Repo name: `Pakalorie_FYP` (matches Stitch project)
- Firebase via JS SDK (`firebase` package) for Expo Go compatibility
- Apple Sign-In + Phone OTP stubbed in AuthContext, not removed
- Auth screens use design tokens directly (Geist + spacing) rather than v2's
  legacy Button/Input components — those still hardcode PlusJakartaSans and
  will get migrated during Phase 2 polish.

### Blockers
- **Smoke-test on device** (Arham): run `npx expo start -c`, scan with Expo Go, and exercise email/password auth + scan flow. Google OAuth is build-only, not Expo Go.

### Pending todos
- **Arham:** smoke-test on device through Expo Go (Android and iPhone if available).
- **Claude:** decide whether Google OAuth needs a dev-build test before P1 Mid demo, or whether email/password is enough for the live Expo Go demo.
- **Codex (Day 6-7):** CDX-001 — Firestore migration spec for non-auth collections (`food_logs`, `hydration_logs`, `favorites`, `chat_sessions`, `weight_logs`).

## Plan Reference

Master plan: `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`
PRD: `docs/PRD.md`
Design: `docs/DESIGN.md`
Codex queue: `.handoff/TO_CODEX.md`
GitHub: https://github.com/arhamhi/Pakalorie_FYP
