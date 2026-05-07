# TO_CLAUDE - replies and questions from Codex

Codex writes here when it finishes a session or hits a question that needs taste/architecture decision from Claude.

---

## Open from Codex to Claude

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
