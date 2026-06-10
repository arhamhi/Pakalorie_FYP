# Volume & Depth Estimation (MiDaS) — Methodology and Limitations

Module: CDX-007 / Phase 4 (P1 Final). Deliberately minimal scope, agreed in
`.handoff/DECISIONS.md`: partial marks accepted; no faked accuracy.

## What it does

`POST /portion` accepts a food photo and returns a coarse portion-size bucket
(`small` / `medium` / `large`) with a kcal multiplier (`0.75` / `1.0` / `1.3`)
that `POST /calories` can consume via `portion` and/or `portion_multiplier`.

Pipeline:

1. **Depth inference.** The pretrained **MiDaS v2.1 small** model
   (isl-org/MiDaS, ONNX export, 256x256 input) runs on the VPS **CPU** via
   onnxruntime. It produces a *relative inverse-depth map*: larger values mean
   closer to the camera. Nothing runs on the phone.
2. **Normalization.** The map is min-max normalized to [0, 1]. If the depth
   range is nearly zero (flat scene, failed inference), the result is flagged
   degenerate and the bucket defaults to `medium`.
3. **Heuristic scoring.** Two cues approximate "how much food is there":
   - **Mound prominence** — mean normalized depth of the central 50% box minus
     the outer 10% border ring. Food on a plate photographed from above sits
     closer to the camera than the surrounding table, so a taller/larger
     serving raises this difference.
   - **Near-fill fraction** — the fraction of all pixels in the nearest depth
     band (above min + 75% of the range). A serving that fills the frame
     raises this.
   - Combined: `score = 0.6 * near_fill + 0.4 * min(1, prominence)`.
4. **Bucketing.** `score <= 0.15 -> small`, `score >= 0.45 -> large`,
   otherwise `medium`.

## Why a bucket, not grams

Monocular depth from **one uncalibrated phone photo is relative, not metric**.
MiDaS is trained with scale- and shift-invariant losses; its output has no
absolute units. Recovering real volume would require a known reference (plate
diameter, fiducial marker, depth sensor, or multi-view geometry) and a
segmentation of the food region — none of which exist in this pipeline.
Mapping relative depth to grams would be fabricated precision, so we do not
do it. The honest deliverable is a coarse bucket with the heuristic stated.

## Known limitations (state these in the report)

1. **Relative depth only.** No absolute scale; the same dish photographed
   closer scores "larger". Camera distance and angle dominate the signal.
2. **Heuristic constants are eyeballed**, tuned on a handful of photos, not
   calibrated against a labeled portion-size dataset. There is no accuracy
   number for the bucket itself, and we do not invent one.
3. **No food segmentation.** The central-box assumption breaks when the dish
   is off-center, when multiple dishes share the frame, or when a hand/utensil
   is closest to the camera.
4. **Texture-poor scenes** (plain plates, flat curries, low light) can produce
   near-flat depth maps; the module then deliberately falls back to `medium`
   instead of guessing.
5. **The multipliers (0.75 / 1.0 / 1.3) are convention, not measurement** —
   chosen so a wrong bucket bounds the calorie error to roughly +/-30%.

## What a real production path would need (future work, P2+)

- A plate/food segmentation model (e.g. SAM or a trained U-Net) to isolate the
  food region before depth statistics.
- A metric reference: known plate diameter prompt, ARKit/ARCore depth, or a
  credit-card-sized fiducial.
- A labeled portion dataset to calibrate buckets and report a real accuracy.

## Operations

- Model file: `backend/models/midas_small_256.onnx` (~64 MB), downloaded by
  `python -m scripts.download_midas` (path configurable via
  `MIDAS_MODEL_PATH`). Gitignored; the endpoint returns a clear 503 until it
  is installed.
- Inference cost: CPU-only, ~1-2 s per image on the 2 vCPU VPS at 256x256;
  runs in a worker thread so the event loop stays free.
- Tests: `backend/tests/test_depth.py` — pure heuristic unit tests (synthetic
  depth maps), the 503 path, multiplier math, and a real-inference test that
  auto-skips when the model file is absent.
