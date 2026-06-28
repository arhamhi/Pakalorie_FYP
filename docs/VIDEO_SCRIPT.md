# Pakalorie FYP — Showcase Video Script

Screen recording + voiceover. Target ~5-6 min. **[ON SCREEN]** = what to record,
**VO** = what to say. Keep the voice casual and confident.

> Honesty rule baked into this script: recognition in the live app runs on
> **Gemini Vision**; the **YOLOv8 model is our own trained contribution and the
> P2 on-device path**, not yet wired into the app. Never claim the app uses the
> trained model — the wording below is already defense-safe.

---

## Scene 1 — The problem (~25s)
**[ON SCREEN]** Title card or the app icon.
**VO:** "Pakistan has over 30 million adults living with diabetes — around one in
four, one of the highest rates in the world. And almost every calorie-tracking
app is built around Western food; it has no idea what a plate of biryani or a
paratha is. So we built Pakalorie: an AI nutrition app made for desi food and
Pakistani users."

> Source for the stat: IDF Diabetes Atlas. Do NOT use "80 million / 20 million" —
> that's inaccurate; the figure above is both correct and stronger.

## Scene 2 — Onboarding + auth (~30s)
**[ON SCREEN]** Open app, sign up / log in with **email/password** (not Google),
go through a couple of onboarding screens (name, goal, target).
**VO:** "You sign up and it walks you through your goals, weight, and target
calories. Auth is real Firebase — your profile syncs to the cloud, so it follows
you across devices. The onboarding is built to feel like a proper consumer app,
Urdu-English mixed, not a clinical form."

## Scene 3 — Home dashboard (~25s)
**[ON SCREEN]** Home tab: calorie ring, macros, AI advice line.
**VO:** "This is the home screen — calories left for the day, your protein, carbs
and fat, and an AI coach line that changes based on where you're at. Everything
here is driven by what you actually log."

## Scene 4 — Hero feature: AI food scan (~45s)
**[ON SCREEN]** Tap scan, capture/select a desi dish, show recognition, then the
result with calories + macros + the "how we got this" card.
**VO:** "Here's the main feature. I take a photo of my food, and it recognizes
the dish and gives me grounded calories and macros. This isn't a blind chatbot
guess — it runs through our own backend, which recognizes the dish and then
grounds the numbers against a real Pakistani food database, with portion sizes
and an explanation of where the figure came from. If the backend is ever down,
it falls back to on-device AI so you always get an answer."

## Scene 5 — Search + the live food DB (~20s)
**[ON SCREEN]** Search, type "biryani", show results with Urdu names + portions.
**VO:** "I can also search the database directly. Every food has an English and
Urdu name, proper portion sizes, and real macros. This is our own dataset, not a
scraped US calorie app."

## Scene 6 — Ustad, the AI chatbot (~30s)
**[ON SCREEN]** Open chat, ask e.g. "dinner mein kya khaun, 500 calories bachi
hain?", show the reply.
**VO:** "Then there's Ustad, the AI nutrition coach. It knows your remaining
calories and goal, and it talks like a real desi trainer — gives you specific
swaps, like roti instead of paratha to save calories."

## Scene 7 — Tracking: trends, calendar, water (~30s)
**[ON SCREEN]** Trends graph, calendar log, water tab adding a glass.
**VO:** "On the tracking side: trends show your calories and water over time, the
calendar lets you scroll back through any day, and water tracking is one tap. All
of it reads from your real logs."

## Scene 8 — Achievements / profile (~15s)
**[ON SCREEN]** Achievements and profile screens.
**VO:** "There's achievements to keep you going, and a profile with your stats
and progress."

> Do NOT point the camera at the "streak" number — streaks aren't computed yet.

## Scene 9 — Behind the scenes: the engineering (~110s) — the part the supervisor wants

**[ON SCREEN] (a) Firebase:** Console → Authentication (a user) → Firestore (the
`users` doc) → Rules tab (the deployed security rule).
**VO:** "Now the engineering behind it. Authentication and user profiles run on
Firebase, with security rules so each user can only ever touch their own data."

**[ON SCREEN] (b) Code:** VS Code, show the folder structure (`app/`, `src/`,
`backend/`, `ml/`), open `src/lib/api.ts` and scroll.
**VO:** "The app is React Native with Expo and TypeScript, organised into the
mobile app, the backend, and the machine-learning pipeline."

**[ON SCREEN] (c) Backend (live):** Browser → `https://api.srv987636.hstgr.cloud/healthz`,
then `/foods/search?q=biryani` (or `/docs`).
**VO:** "The backend is a FastAPI server, live on our own VPS over HTTPS. This is
the real deployed API the app calls — here it is returning grounded nutrition
data for biryani. The full pipeline is connected: a photo goes to recognition,
then a MiDaS depth model estimates the portion size, then a retrieval-augmented
calorie engine grounds the calories in the database — all of it deployed and
working end to end."

**[ON SCREEN] (d) ML — our trained model:** Open the Colab notebook
`ml/notebooks/train_yolov8_cls.ipynb`, then show
`ml/reports/confusion_matrix_normalized.png`, `ml/reports/training_curves.png`,
and `ml/reports/per_class_recall.csv`.
**VO:** "And this is our own model. We trained a YOLOv8 image classifier on a
merged dataset of around 8,600 Pakistani food images across 217 classes, on a
free Colab GPU. We did the full pipeline ourselves — cleaning and de-duplicating
the data, a stratified split, training, and honest evaluation. The baseline hits
**59% top-1 and 87% top-5** accuracy across 217 fine-grained dishes. It's strong
where the data is well represented — biryani, chai, samosa near the top — and the
weaker classes are simply the ones with very few training images, which we report
honestly rather than hide. Recognition in the app today runs on Gemini; this
trained model is our own machine-learning contribution and our path to moving
recognition fully in-house and on-device."

## Scene 10 — Close (~15s)
**[ON SCREEN]** Back to the app home, or a closing slide.
**VO:** "So that's Pakalorie — a real, working AI nutrition app built for
Pakistan, from the mobile app to a live backend to our own trained model. Thanks
for watching."

---

## How to record (Windows)

- **Phone screen → laptop:** `scrcpy` (free, USB mirror) for clean capture, or
  the phone's built-in screen recorder then transfer the clip.
- **Laptop screen (Firebase, code, backend, Colab):** OBS Studio (free), one
  "Display Capture" scene.
- **Voiceover:** easiest to record clips silent, then voice over in CapCut — you
  can redo a line without re-recording the screen.
- **Order:** record all app scenes in one pass, then all laptop scenes, then
  stitch. Don't attempt one take.

## Defense-safe facts (verified)
- 6/6 modules complete: Auth, Mobile UI, Recognition, Food DB API, MiDaS, Calorie
  Engine + RAG.
- Live pipeline confirmed on a real photo: recognize → "Haleem" (0.98) →
  `/portion` → medium bucket → `/calories` → grounded breakdown.
- YOLOv8n-cls baseline: top-1 0.5848, top-5 0.8659 on 217 classes.
