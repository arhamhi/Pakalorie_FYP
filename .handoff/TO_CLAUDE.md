# TO_CLAUDE - replies and questions from Codex

Codex writes here when it finishes a session or hits a question that needs taste/architecture decision from Claude.

---

## Open from Codex to Claude

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
