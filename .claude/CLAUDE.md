# Claude Code Operating Instructions

This repo is Pakalorie FYP. Treat it as a staged migration from `Pakalorie_v2`, not as a greenfield app.

## Source Of Truth

Before doing any work, read these files in order:

1. `.handoff/STATE.md` - current state, blockers, and next owner.
2. `.handoff/TO_CLAUDE.md` - Codex replies, open questions, and risk flags.
3. `.handoff/DECISIONS.md` - architecture decisions. Do not re-litigate logged decisions.
4. `docs/DESIGN.md` for visual system work.
5. `docs/PRD.md` and `.planning/ROADMAP.md` for scope.
6. Master plan: `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`.

If files disagree, prefer this order: `.handoff/STATE.md`, then `.handoff/DECISIONS.md`, then `.handoff/TO_CLAUDE.md`, then the master plan, then older docs.

## Claude Lane

Claude Code owns mobile, UI, product feel, and supervisor-facing clarity:

- `app/`
- `src/components/`
- `src/contexts/` when auth/UI-related
- `src/constants/colors.ts`
- `docs/DESIGN.md`
- auth screens, Expo Router flows, capture/results polish
- demo flow, screenshots, README polish, supervisor-facing docs

Avoid backend/schema/infra work unless Arham explicitly assigns it. Do not build FastAPI, Postgres migrations, seed scripts, or Render infra when the task belongs to Codex.

## Shared Files

These files may be touched carefully:

- `.handoff/STATE.md`
- `.handoff/TO_CODEX.md`
- `.handoff/TO_CLAUDE.md`
- `.handoff/DECISIONS.md`
- `README.md`
- `.env.example`
- `package.json` only when a dependency change is genuinely required

When editing shared files, keep the change surgical and explain why.

## Session Start Protocol

At the start of every Claude Code session:

1. Read `.handoff/STATE.md`.
2. Read `.handoff/TO_CLAUDE.md`.
3. Read `.handoff/DECISIONS.md` before architecture changes.
4. Identify the current blocker and next owner.
5. State what files you expect to touch before editing.

## Session End Protocol

Before ending any meaningful session:

1. Update `.handoff/STATE.md` with what changed, what works, what is blocked, and the next owner.
2. Update `.handoff/TO_CODEX.md` if Codex has a new or changed backend/schema/infra task.
3. Write questions or review notes for Codex in `.handoff/TO_CODEX.md` or `.handoff/TO_CLAUDE.md`, whichever matches the direction of handoff.
4. Append to `.handoff/DECISIONS.md` only for real architecture/product decisions.
5. Do not mark planned work as done unless the code or document actually exists.

## Current Product Direction

- P1 Mid scope: Firebase auth, capture/results UI, FastAPI/Postgres food database API.
- Light mode only for May. Dark mode polish is deferred.
- UI direction: Apple-like structure, Cal AI/MacroFactor personality, 70/20/10 visual system.
- Fonts: Geist Sans for UI/body/headings, Instrument Serif for hero numerics.
- Demo target: real Android phone via dev build.

## Guardrails

- Keep UI work polished but scoped. Do not let visual polish consume backend timeline.
- Do not move Gemini deeper into the mobile client; long-term path is FastAPI server-side.
- Do not expand Supabase unless documented as a temporary bridge.
- Do not touch Codex-owned backend files unless explicitly assigned.
- Keep FYP demo reality honest: if something is pending, say it is pending.
