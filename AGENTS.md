# Codex Operating Instructions

This repo is Pakalorie FYP. Treat it as a staged migration from the v2 Expo app into the FYP architecture, not as a greenfield project.

## Source Of Truth

Before doing any work, read these files in order:

1. `.handoff/STATE.md` - current project state, blockers, next owner.
2. `.handoff/TO_CODEX.md` - Codex task queue. Execute only the assigned task.
3. `.handoff/DECISIONS.md` - architecture decisions. Do not re-litigate logged decisions.
4. The relevant spec/design file for the task, usually `docs/PRD.md`, `docs/DESIGN.md`, `.planning/ROADMAP.md`, or the master plan at `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`.

If these disagree, prefer this order: `.handoff/STATE.md`, then `.handoff/DECISIONS.md`, then `.handoff/TO_CODEX.md`, then the master plan, then older docs.

## Codex Lane

Codex owns backend and systems work:

- `backend/`
- `backend/docs/`
- FastAPI, PostgreSQL, SQLAlchemy, Alembic, seed scripts
- Firestore schema, security rules, indexes, migration specs
- API contracts and deployment docs
- Render/Supabase/Neon infrastructure notes
- Consistency audits between code, docs, and handoff state

Avoid mobile UI/product taste work unless Arham explicitly assigns it. Do not redesign screens, rewrite copy, or change app flow when the task is backend/schema/infra.

## Shared Files

These files may be touched carefully:

- `.handoff/STATE.md`
- `.handoff/TO_CLAUDE.md`
- `.handoff/TO_CODEX.md`
- `.handoff/DECISIONS.md`
- `README.md`
- `.env.example`
- `package.json` only when a dependency change is genuinely required

When editing shared files, keep the change surgical and explain why.

## Session Start Protocol

At the start of every Codex session:

1. Read `.handoff/STATE.md`.
2. Read `.handoff/TO_CODEX.md`.
3. Identify the single active task ID, for example `CDX-001`.
4. State what files you expect to touch before editing.
5. Do not run builds, installs, tests, servers, or scripts unless the task requires verification or Arham approves.

## Session End Protocol

Before ending any meaningful session:

1. Update `.handoff/STATE.md` with what changed, what works, what is blocked, and the next owner.
2. Write a concise block in `.handoff/TO_CLAUDE.md` with:
   - Done
   - Open questions
   - Risk flags
   - Files touched
3. Update `.handoff/TO_CODEX.md` only when the Codex queue changes.
4. Append to `.handoff/DECISIONS.md` only for real architecture/product decisions.
5. Do not mark planned work as done unless the code or document actually exists.

## Current Architecture Intent

- Mobile app: Expo SDK 54, Expo Router, NativeWind, TanStack Query.
- Auth and user profile: Firebase Auth + Firestore.
- User logs/history: Firestore, migration pending.
- Food/nutrition API: FastAPI + PostgreSQL, not built yet.
- Recognition for P1 Mid: Gemini Vision behind FastAPI, not client-side long term.
- YOLOv8, MiDaS, Health Sync, dark mode polish, and Ustad chatbot are deferred.

## Guardrails

- Do not expose Gemini keys in the mobile bundle.
- Do not keep expanding Supabase usage unless it is an intentional temporary bridge documented in `.handoff/STATE.md`.
- Do not change Claude-owned UI files for backend tasks.
- Do not create a second planning system. Use `.handoff/` and `.planning/`.
- Do not overwrite user or Claude changes. Inspect before editing.
- Keep FYP demo reality honest: if something is pending, say it is pending.
