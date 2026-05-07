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

## 2026-05-07 — Repo name: `FYP-Pakalorie` (not `pakalorie`)

**Decision:** GitHub repo named `FYP-Pakalorie` to keep the university submission visually distinct from the personal `Pakalorie_v2` codebase.

**Why:** Multiple Pakalorie folders already exist on disk and across other accounts. Prefixing with `FYP-` makes it grep-friendly and unambiguous when supervisor asks for a link.

**Rejected:** `pakalorie`, `pakalorie-fyp` (lowercase reads as "version") — the user explicitly wanted clear separation.
