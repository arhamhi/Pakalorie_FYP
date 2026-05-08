# Pakalorie — Product Requirements Document

**Project:** Pakalorie — AI-powered Pakistani food recognition + calorie tracking mobile app
**Version:** FYP v1.0 (university submission scope)
**Authors:** Arham Hafeez (technical lead), Hassan Nadeem, Husnain Sarwar
**Supervisor:** Sir Hamza Imran, SZABIST Islamabad
**Program:** BS(AI) Final Year Project, Spring 2026
**Document status:** Living. Updated as scope locks in across milestones.

---

## 1. Vision

Pakalorie is a localized health and wellness tool for the Pakistani market. It closes the "Desi Food Gap" left by global apps (MyFitnessPal, Cal AI, MacroFactor) — none of which recognize chicken karahi, biryani, or daal chawal accurately, and none of which speak Roman Urdu. Pakalorie identifies Pakistani dishes from a phone photo, estimates calories and macros, lets users adjust for portion + cooking modifiers (extra oil, with naan), and coaches them with a culturally fluent AI persona.

The FYP submission scope is a working subset of this vision — enough to show the technical pipeline (image → model → DB → user) end-to-end, with the harder ML pieces (custom YOLOv8 detector, monocular depth-based portion estimation) staged across the four FYP milestones.

---

## 2. Problem statement

1. **Existing trackers don't recognize desi food.** Cal AI's Vision model misclassifies karahi as "stew" or "curry," strips the dish of its actual macro profile, and forces manual entry — the exact friction the app was supposed to remove.
2. **Manual entry is the failure mode.** Pakistanis open MyFitnessPal, can't find "aloo paratha with achaar," log a generic "potato pancake" with wrong macros, and stop logging within a week.
3. **Cultural context is missing.** No tracker accounts for serving-size cultural norms (Pakistani Medium ≠ American Medium), modifier patterns (everything has more oil than the recipe says), or motivational tone that resonates locally.
4. **Bilingual UX is a hard requirement.** Pakistani Gen Z and Millennials speak in Roman Urdu / English code-switch. Pure English apps feel sterile; pure Urdu apps lose readability.

---

## 3. Target audience

- **Primary:** Pakistani Gen Z and Millennials, 18–35.
- **Behavior:** Tech-savvy, fitness-conscious or fitness-curious, fluent in Roman Urdu, value premium aesthetics, will not tolerate "AI-slop UI."
- **Devices:** Both platforms in scope. Mid-range Android dominant in PK (Samsung A-series, Infinix, Tecno); iPhone minority but high-LTV. App targets parity from day one.
- **Connectivity:** Patchy. Offline-first is a requirement, not nice-to-have.

---

## 4. Success criteria (FYP scope)

| Dimension | P1 Mid (May 2026) | P1 Final (Aug 2026) | P2 Mid (Nov 2026) | P2 Final (Feb 2027) |
|---|---|---|---|---|
| Recognition | Gemini Vision stub via FastAPI | YOLOv8 custom model, ≥75% top-1 on test set | YOLOv8 + MiDaS portion estimation | Quantized on-device inference fallback |
| Auth | Firebase email/password + Google | Add Apple Sign-In | — | — |
| Logging | Manual + scan | Scan with confidence + alternatives | Portion adjustment | Full edit history |
| Coach | Out of scope | Ustad chatbot v1 | Daily insights | Weekly summary |
| Health sync | Out of scope | Out of scope | Google Fit + HealthKit | Wear OS / Watch |
| UI | Light mode, 3 polished surfaces | Dark mode + animations | Onboarding redesign | Final polish + accessibility |

---

## 5. P1 Mid scope (this PRD's commitment)

Three modules, due **end of May 2026**.

### 5.1 Authentication & User Management

**User stories:**
- As a new user, I can sign up with email + password and immediately land on a usable home screen.
- As a returning user, I can sign in with Google in two taps.
- As a forgetful user, I can reset my password via email link.
- As a privacy-conscious user, I can sign out and my session ends across the app.

**Functional requirements:**
- Firebase Auth (email/password + Google providers).
- Firestore `users/{uid}` document created on first sign-in with onboarding state flag.
- Persistent session across app restarts.
- Auth-gated routes — unauthenticated users redirected to `/welcome`.
- Validation: email format, password length ≥8, error messages localized for the 70/30 EN/UR mix.

**Non-functional:**
- Sign-in flow completes in <3 seconds on a stable connection.
- No credentials ever leave the client unencrypted.
- Token refresh handled silently by Firebase SDK.

### 5.2 Core Mobile UI — Capture & Results

**User stories:**
- As a user with a plate of food, I can open the app, tap a single button, and capture an image.
- As a user, I see calories and 4 macros within 5 seconds of capture.
- As a user, I can save the result to my history with one tap.
- As a user with a bad result, I can see the AI's confidence and skip saving.

**Functional requirements:**
- Camera permission flow with explainer screen if denied.
- Image compression to <1MB pre-upload (`expo-image-manipulator`).
- Gallery upload fallback when camera unavailable.
- Loading skeleton on Results screen during inference.
- Hero card: dish name, confidence pill, Instrument Serif calorie number, "kcal" sub-label.
- 4-card macro grid: protein, carbs, fat, fiber (g).
- "Save to history" CTA writes to Firestore `users/{uid}/food_logs`.
- Medical disclaimer footer.
- Confidence <70% → show alternatives list per FR13.

**Non-functional:**
- Capture-to-Results latency target: <5s p95 on 4G.
- All 3 surfaces use Geist Sans + Instrument Serif + the 70/20/10 token system (see `DESIGN.md`).

### 5.3 Food Database API (FastAPI + PostgreSQL)

**Endpoints (P1 Mid):**
1. `POST /recognize` — multipart image → `{food_label, confidence, alternatives[]}`. Backed by Gemini Vision in P1 Mid; YOLOv8 swaps in for P1 Final.
2. `GET /foods/search?q=` — fuzzy search by English + Roman Urdu name.
3. `GET /foods/{id}` — full nutrition + portion variants.
4. `POST /foods/{id}/nutrition` — `{portion, modifiers[]}` → adjusted macros via `Final = Base × Scale + ModifierConstant`.
5. `GET /healthz` — uptime check.

**Database (PostgreSQL):**
- `foods (id, name_en, slug, default_portion, source)`
- `food_aliases (food_id, alias, language)` — Roman Urdu + English aliases.
- `nutrition_facts (food_id, calories, protein_g, carbs_g, fat_g, fiber_g, per_g)`
- `portion_sizes (food_id, label, scale_factor, weight_g)` — small/medium/large/restaurant.
- `modifier_constants (modifier_key, kcal_delta, fat_delta_g)` — extra_oil, with_naan, with_fizzy_drink.

**Seed data:**
- v1 dataset `pakalorie_food_database.json` (100+ Pakistani dishes) → primary seed.
- USDA FoodData Central public dump → augment for global items (rice, chicken breast, etc.).

**Non-functional:**
- All Gemini API calls server-side. No API keys in mobile bundle.
- Render free tier deployment. Keep-alive cron for demo week to avoid cold-start.
- HTTPS via Render's default cert.

---

## 6. Functional requirements traceability (FYP doc → this PRD)

The university Overleaf document specifies FR1–FR16. Coverage in P1 Mid:

| FR | Description | P1 Mid status |
|---|---|---|
| FR1 | User registration | ✅ Implemented |
| FR2 | User login | ✅ Implemented |
| FR3 | Password reset | ✅ Implemented |
| FR4 | Profile management | ⚠️ Basic (display name, photo). Health stats deferred to P1 Final. |
| FR5 | Onboarding flow | ⚠️ Carried over from v2; not re-styled in P1 Mid |
| FR6 | Image capture | ✅ Implemented |
| FR7 | Gallery upload fallback | ✅ Implemented |
| FR8 | <5s recognition latency | ⚠️ Conditional on Render warm state |
| FR9 | Results screen with macros | ✅ Implemented |
| FR10 | Save to history | ✅ Implemented |
| FR11 | Manual food search | ✅ Implemented (via `/foods/search`) |
| FR12 | Portion adjustment | ⚠️ API ready; UI deferred to P1 Final |
| FR13 | Show alternatives when confidence <70% | ✅ Implemented |
| FR14 | Hydration tracking | ⛔ Deferred to P1 Final |
| FR15 | AI coach (Ustad) | ⛔ Deferred to P1 Final |
| FR16 | Health sync (Fit / HealthKit) | ⛔ Deferred to P2 Mid |

---

## 7. Out of scope (P1 Mid)

- YOLOv8 custom training and dataset expansion
- MiDaS monocular depth estimation
- Google Fit / Apple HealthKit sync
- Ustad AI coach chatbot
- Restaurant discovery (Google Places integration)
- Achievements, streaks, gamification UI beyond a basic counter
- Push notifications
- Dark mode runtime switching
- Animations / micro-interactions
- Onboarding visual redesign
- Accent picker UI in settings
- iOS App Store submission (deferred to P2 Final). iOS simulator + TestFlight demo are in scope.

---

## 8. Constraints

- **Timeline:** Hard 3–4 weeks for P1 Mid. Live demo on real Android phone in late May 2026.
- **Budget:** $0 net new spend. All chosen tools have free tiers (Render free, Supabase / Neon free, Firebase Spark, GitHub free, Google Fonts free).
- **Team:** Arham writes 100% of code. Hassan Nadeem owns documentation; Husnain Sarwar owns presentation and test cases.
- **Doc compliance:** University Overleaf doc commits us to specific stack choices (Firebase + FastAPI + PostgreSQL). Doc compliance > engineering elegance during grading.
- **Demo:** Arham's Android (daily driver) for primary live demo via EAS dev build. iOS support shipped via EAS cloud build — physical iPhone demo (TestFlight) is best-effort and gated on Apple Developer account purchase ($99/yr); iOS Simulator build is the fallback.

---

## 9. Risks (top 5)

1. **Firebase migration slips Week 1.** Mitigation: Day 5 checkpoint — if blocked, fall back to dual-auth (Firebase for auth-only; Supabase Postgres still serves data) and document the deviation.
2. **Render free tier cold-start violates FR8.** Mitigation: keep-alive cron via `mcp__scheduled-tasks` hitting `/healthz` every 10 min during demo week.
3. **Gemini API rate limit during demo.** Mitigation: server-side caching of recent recognitions; demo script uses pre-warmed dishes.
4. **Demo phone bricks day-of.** Mitigation: pre-recorded screen capture as fallback; emulator build also tested.
5. **Hassan / Husnain miss documentation deadline.** Mitigation: Arham keeps doc files in shared Drive and ghostwrites gaps in Week 4 if needed.

Full risk register lives in the master plan at `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`.

---

## 10. Acceptance test (P1 Mid demo)

Run before demo day:

1. Fresh install on Arham's Android via EAS dev build.
2. Sign up new account with email/password → Firestore `users/{uid}` doc created.
3. Log out, sign in with Google → land on home tab.
4. Tap Capture → grant camera → snap chicken karahi → Results screen shows calories + 4 macros + confidence within 5s.
5. Save to history → entry appears with timestamp.
6. Force-quit → relaunch → still signed in.
7. Airplane mode → graceful "no connection" UI.
8. `curl https://<deployed>/healthz` → 200.
9. `curl https://<deployed>/foods/search?q=karahi` → returns chicken karahi.
10. UI spot-check: all 3 P1 Mid surfaces use Geist + Instrument Serif + 70/20/10 tokens.

---

## 11. References

- FYP Overleaf doc: `C:\Users\Arham\OneDrive\Desktop\Uni\FYP\Pakalorie_FYP_Final_Overleaf.pdf`
- v2 codebase (forked into this repo): `C:\Users\Arham\OneDrive\Desktop\AI Work\Pakalorie_v2\app`
- v1 dataset: `C:\Users\Arham\OneDrive\Desktop\AI Work\Pakalorie\pakalorie_food_database.json`
- Master plan: `C:\Users\Arham\.claude\plans\and-they-actually-need-shimmering-volcano.md`
- Design system: `docs/DESIGN.md` (this repo)
- Decisions log: `.handoff/DECISIONS.md`
