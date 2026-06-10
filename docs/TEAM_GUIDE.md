# Pakalorie Team Guide

For Hassan, Husnain, and anyone else on the group. This is the one document
that tells you how to run things and where everything for the report lives.
You do not need to have followed the development to use it.

Last updated: 2026-06-10.

---

## 1. Project snapshot (read this first)

Pakalorie is a Pakistani-food calorie tracker: photograph a dish, the app
recognizes it, estimates the portion, and returns a calorie/macro breakdown
grounded in a real nutrition database.

**P1 Final = cumulative 50%, due before July 2026.** Four graded modules:

| Module | What it is | Status |
| --- | --- | --- |
| Food Database API | FastAPI + PostgreSQL on our VPS, 160 foods (30 curated desi + 130 USDA), 5 endpoints | **LIVE** at `https://api.srv987636.hstgr.cloud` |
| Calorie Engine + RAG | Retrieves nutrition rows from the DB, Gemini composes a grounded answer + "why" + sources | **LIVE** (same API, `POST /calories`) |
| YOLOv8 Training | Real 218-class food classifier trained on Kaggle desi-food data | **Notebook ready — needs one Colab run** (Section 2) |
| MiDaS Depth | Server-side relative depth → portion bucket (small/medium/large) | **Code + tests done**, `POST /portion` (honest limitations documented) |

Already submitted at midterm (25%): Firebase auth + camera/results UI.
The mobile app (Expo/React Native) calls the live API end-to-end with an
on-device Gemini fallback if the backend is unreachable.

Quick proof the backend is alive (any browser):
`https://api.srv987636.hstgr.cloud/healthz` → `{"status":"ok"}`
`https://api.srv987636.hstgr.cloud/foods/search?q=nihari` → real DB rows.

---

## 2. Train the YOLOv8 model on Colab (anyone can do this)

The whole training run is one notebook: `ml/notebooks/train_yolov8_cls.ipynb`.
It produces every ML artifact the report needs. Budget ~90 minutes, mostly
waiting.

### What you need before opening Colab

1. **A Google account** (for Colab + Drive; artifacts persist on your Drive).
2. **A Kaggle account + API token.** kaggle.com → profile picture → Settings →
   API → *Create New Token*. A file `kaggle.json` downloads. Keep it.
3. **GitHub access to our private repo.** Ask Arham for a fine-grained
   personal access token (read-only) for `arhamhi/Pakalorie_FYP`, or make your
   own if you have repo access: GitHub → Settings → Developer settings →
   Fine-grained tokens → Contents: Read-only on that repo.

### Steps

1. Go to [colab.research.google.com](https://colab.research.google.com) →
   *Upload* → pick `ml/notebooks/train_yolov8_cls.ipynb` from the repo
   (download just that file from GitHub web if you don't have a clone).
2. Menu: **Runtime → Change runtime type → T4 GPU**. Free tier is enough.
3. Run cells top to bottom with `Shift+Enter`. Each cell says what it does.
   You will be prompted twice: upload `kaggle.json` (cell 4) and paste the
   GitHub token (cell 6, input is hidden).
4. The training cell runs ~30–60 min (one progress line per epoch). Keep the
   tab open if you can.
5. **If Colab disconnects:** reconnect, re-run all cells from the top EXCEPT
   the training cell, then run the **"Resume after disconnect"** cell.
   Checkpoints are on your Drive; nothing is lost.
6. After eval, the last cells ask you to upload a few of **our own food
   photos** (get them from Arham) for qualitative predictions, then print a
   ready-made metrics block.

### What to send back to Arham

All of it is on your Google Drive in `pakalorie_ml/` — share the folder:

- `runs/yolov8n_cls_218/weights/best.pt` + `best.onnx` (the trained model)
- `reports/eval_metrics.json` (top-1/top-5 accuracy)
- `runs/yolov8n_cls_218_eval/confusion_matrix_normalized.png`
- `reports/per_class_recall.csv` (worst-class error analysis)
- `reports/qualitative_predictions.md` (our own photos)
- `reports/modelcard_block.md` (gets pasted into `ml/MODELCARD.md`)

**Do not panic at a "low" accuracy.** 218 classes with a 14.6x class
imbalance and a noisy source dataset is a hard problem; an honest baseline
plus error analysis scores better with supervisors than an inflated number.
The agreed follow-up to a weak run is `yolov8s-cls` (bigger model), not
deleting awkward classes.

---

## 3. Run the app + backend locally (so any member can demo)

### Mobile app (Expo Go — no Android Studio needed)

1. Install Node 20+, clone the repo, then in the repo root:
   ```powershell
   npm install
   Copy-Item .env.example .env
   ```
2. Fill `.env`: ask Arham for the `EXPO_PUBLIC_FIREBASE_*` values (Firebase
   web config — safe for clients, but our repo keeps them out of git).
   `EXPO_PUBLIC_API_BASE_URL` already points at the live API. Optionally set
   `EXPO_PUBLIC_GEMINI_API_KEY` to enable the offline fallback path.
3. Install **Expo Go** on your phone (Play Store / App Store).
4. Start the dev server (the worker cap matters on Windows + OneDrive):
   ```powershell
   npx expo start -c --max-workers 2
   ```
5. Scan the QR with Expo Go (phone and laptop on the same Wi-Fi).
6. Walk the flow: welcome → sign up with email → scan tab → photograph food →
   result shows a green **DB-grounded** pill, macros, and a "How we got this"
   card → save to history.

### Backend (you usually do NOT need to run it)

The backend is already live on the VPS; the app talks to it over HTTPS. Run it
locally only if you're changing backend code:

```powershell
cd backend
uv sync                                  # Python 3.11+; install uv first
Copy-Item .env.example .env              # leave GEMINI_API_KEY empty for the offline fallback
uv run uvicorn app.main:app --reload     # http://127.0.0.1:8000/docs
uv run pytest                            # unit tests pass with no DB; integration tests auto-skip
```

A local Postgres is only needed for DB-touching endpoints; see
`backend/docs/LOCAL_DB_SMOKE.md`. Don't deploy anything — deploys follow
`backend/docs/DEPLOY.md` and go through Arham.

---

## 4. Report / SDS material map (for Hassan + Husnain)

Every ingredient the report needs already exists or has a designated landing
spot. Cite file paths, paste tables, crop screenshots.

| Report section | Source of truth |
| --- | --- |
| System architecture + diagram | `docs/SDS.md` §1 (Mermaid diagram renders on GitHub) |
| Requirements / scope | `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` |
| API specification | `backend/docs/API_CONTRACT.md` (all 7 endpoints, request/response JSON) + live OpenAPI at `https://api.srv987636.hstgr.cloud/docs` |
| Database schema + seed provenance | `backend/docs/DATA_NOTES.md`, models in `backend/app/db/models.py`, 30 desi + 130 USDA split |
| RAG / calorie engine methodology | `docs/SDS.md` §3 + `backend/app/services/calorie_engine.py` (grounding prompt is in the code) |
| Calorie engine evaluation table | `docs/SDS.md` §5 (predicted vs reference kcal on the live API) |
| YOLOv8 dataset audit | `ml/reports/dataset_audit.md` (per-class counts, imbalance, dedupe) |
| YOLOv8 training method + metrics | `ml/MODELCARD.md` (top-1/top-5, confusion matrix, error analysis — filled after the Colab run, Section 2) |
| MiDaS methodology + limitations | `backend/docs/DEPTH_NOTES.md` (write the limitations verbatim — honesty is the point) |
| Security posture | HTTPS via Traefik + Let's Encrypt; DB bound to localhost only; Gemini key server-side only; see `backend/docs/DEPLOY.md` |
| Screenshots | `Pakalorie_Screenshots/` (one level above the repo) + take fresh ones of the DB-grounded result screen |
| Demo video | `Pakalorie_Showcase.mp4` (midterm) — record a new one after the on-device smoke test |

Numbers you can quote without re-checking: 160 foods seeded (30 `desi_v1` +
130 `usda`), 218 classes / 8,660 images / 14.58x imbalance in the merged
training set, 5 DB tables (`foods`, `food_aliases`, `nutrition_facts`,
`portion_sizes`, `modifier_constants`), API smoke 10/10, backend tests green
(unit + live-DB integration + depth).

---

## 5. Demo-day runbook

### Setup (do this BEFORE the panel arrives)

1. Phone: Expo Go installed, app loaded once already (warm cache), brightness
   up, Do Not Disturb on.
2. Laptop: `npx expo start -c --max-workers 2` running, QR scanned, phone on
   the same hotspot/Wi-Fi as the laptop.
3. Open `https://api.srv987636.hstgr.cloud/healthz` in a browser tab — if it
   says `{"status":"ok"}`, the pipeline is up.
4. Have 2–3 real desi food photos in the phone gallery as backup (Haleem is
   proven: recognized at 0.98 confidence) in case live food/lighting is bad.
5. Have the backup video on the desktop, full-screen ready.

### Script (~4 minutes)

1. **One-liner:** "Pakalorie recognizes Pakistani food from a photo and
   returns calories grounded in a real nutrition database — not an LLM
   guessing."
2. Sign in (email/password — Google OAuth is deliberately not in the Expo Go
   demo).
3. Scan a dish (live or from gallery). While it processes: "The image goes to
   our FastAPI server on our VPS over HTTPS; Gemini Vision identifies the
   dish; the name is retrieved against our PostgreSQL food database with
   trigram fuzzy search — it handles Urdu and Roman-Urdu aliases."
4. Result screen — point at the **green DB-grounded pill**: "These numbers
   come from database rows, not model hallucination." Open **"How we got
   this"**: matched row, portion, the engine's why, the data source.
5. Mention fiber showing "—" on desi dishes: "Our curated data has no fiber
   values; we show a dash instead of inventing one." (Supervisors like this.)
6. Save to history. Done.
7. If asked about YOLOv8/MiDaS: quote the model card metrics and the depth
   limitations note — both are honest by design.

### When things break (decide in 10 seconds, don't debug live)

| Symptom | Action |
| --- | --- |
| API down (no green pill, "AI estimate" shows) | Keep going — say "this is our automatic on-device fallback; the grounded path needs our server" and show the healthz tab |
| Wi-Fi dead / Expo Go won't load | Switch phone to mobile data + laptop hotspot; if still dead → backup video |
| Recognition returns "Unknown" | Use a gallery backup photo (Haleem) |
| Total failure | Backup video, narrate over it with the same script |

### Likely panel questions (rehearse these)

- *Why is the calorie answer trustworthy?* → RAG: retrieval from our seeded DB
  constrains Gemini; the response carries the source rows; there's a
  deterministic fallback with the same grounding when Gemini is off.
- *Why classification, not detection, for YOLOv8?* → The Kaggle datasets are
  folder-per-dish with no bounding boxes; labeling boxes wasn't feasible in
  the timeline. Logged decision.
- *Can MiDaS give grams?* → No, and we say so: monocular depth is relative.
  We map it to a coarse portion bucket and documented exactly why
  (`backend/docs/DEPTH_NOTES.md`).
- *Where's the Gemini API key?* → Server-side only; the mobile bundle never
  contains it (the fallback path is the documented exception until the
  on-device test completes, then it's demo-only).
- *What's next (P2)?* → Model quantization for on-device inference, data viz +
  calorie compensation, Urdu localization, health-data sync, AI chat coach.
