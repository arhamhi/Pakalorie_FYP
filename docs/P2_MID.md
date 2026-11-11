# P2 Mid — module summary (November 2026)

Three modules. Everything below exists in the repo; the limits are stated plainly.

## 1. Model Optimization & Quantization

- Script: `ml/scripts/quantize.py` -> results in `ml/reports/quantization.md`.
- Source model: YOLOv8n-cls, 217 classes, 224x224 (`ml/artifacts/checkpoints/best.onnx`).
Measured on 1,516 local validation images (CPU, onnxruntime):

| Variant | Size | Latency | Top-1 | Top-5 |
|---|---|---|---|---|
| fp32 baseline | 6.89 MB | 2.4 ms | 0.700 | 0.927 |
| INT8 dynamic | 1.79 MB | 6.6 ms | 0.592 | 0.885 |
| INT8 static (QDQ, 200-image calibration) | 1.89 MB | 2.1 ms | 0.663 | 0.925 |

- **Static INT8 is the one to use**: 3.6x smaller, as fast as fp32, top-1 down 3.7 points, top-5 down 0.2.
  Dynamic INT8 loses 10.8 points top-1 and is slower on CPU, so it is not recommended.
- **Caveat on absolute numbers:** the split was rebuilt locally and can overlap the model's training data
  (this checkpoint has 217 classes; the model card says 218), which is why the baseline reads 0.700 here
  instead of the official 0.585. Use these numbers to compare variants; cite `ml/MODELCARD.md`
  (top-1 0.585, top-5 0.866) for absolute accuracy.

## 2. Data Visualization + Calorie Compensation

- Rule (single source: `src/lib/compensation.ts`):
  `target = base + carryOver + burnedToday`.
  Surplus or deficit from the last 3 *logged* days is spread over 3 days and capped at +-15% of base.
  Days with no logs are ignored. The target never drops below a 1200 kcal safe minimum (or the user's own
  base, if lower), and the card carries an "estimates only, not medical advice" disclaimer.
- Burned calories are **manual estimates**: MET x weight x time, entered through "Log activity" on Home.
  Not measured; Health Sync is a P2 Final module.
- UI: `src/components/home/BudgetCard.tsx` on Home shows today's budget and a one-line "why".
  The Home ring, macros and "kcal left" use the adjusted target.
- Storage: Firestore `users/{uid}/activity_logs` (existing rules already cover it).
- Trends (`app/(tabs)/trends.tsx`) gained a **Macro Split** card: share of calories from protein, carbs and
  fat over the selected 7/30/90-day range, with average grams per logged day. It shows an honest empty state
  when nothing is logged. The existing calorie, weight and hydration charts are unchanged.

## 3. Real-Time Inference Pipeline (server-streamed)

- Scan screen -> "Live" toggle (`app/(tabs)/scan.tsx`, `src/hooks/useLiveRecognition.ts`).
- A small camera frame goes to `POST /recognize` (engine `yolo`), the next frame is sent as soon as the
  reply lands. One frame in flight at a time.
- Measured from a laptop over the public URL: about 0.77 s per request, so roughly 1 frame per second.
  The overlay shows latency and fps live.
- The top guess is always shown. Under 35% confidence it is labelled "Maybe: ..." and "Low confidence",
  because the model never abstains and its confidences are low (a test on a correct haleem photo gave 10%).
- This is **near real-time via the server, not on-device inference**. On-device needs a custom dev build
  with an ONNX/TFLite runtime and the quantized model above; it is the documented next step.
- The YOLO engine only is used, so live mode spends no Claude API credits.

## On-device test (iPhone 17 Pro simulator, Expo Go 54, 11 Nov 2026)

- New sign-up shows the onboarding target at once (1,372 kcal) and personalised macros: **pass**.
- Log "Walking 30 min": budget 2,846 -> 2,969 (+123 = 3.5 MET x 70 kg x 0.5 h): **pass**.
- Scan + log (haleem, 90%, 300 kcal, database-grounded): budget card persists, kcal left updates: **pass**.
- Trends Macro Split: 27/34/39% for 22 g P / 28 g C / 14 g F; empty state on a fresh account: **pass**.
- Live scan: toggle and overlay work; the simulator has no camera, so real-camera behaviour is **not tested**.
- Carry-over across days: **not tested** (needs meals on two days).

## Known limits

- YOLO top-1 is 58.5%, below the 75% PRD target.
- The server-side LLM is now Claude (`claude-sonnet-5-5`), not Gemini; only `src/lib/gemini.ts` (offline
  fallback and chat coach) still uses Gemini.
