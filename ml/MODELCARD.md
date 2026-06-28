# Pakalorie YOLOv8 Food Classifier Model Card

Status: trained. `yolov8n-cls` baseline complete (2026-06-28). Not wired into the mobile app — the live `/recognize` path stays Gemini Vision for P1 Final; this model is the reported deliverable and the P2 on-device path.

## Intended Use

This model is for the Pakalorie FYP food-recognition carryover task. It is a folder-label food classifier for single-dish food photos. It is not a bounding-box detector and is not wired into the mobile app yet.

## Dataset

Sources:

- `izbaiman/food-images`, Kaggle, CC0/Public Domain, 409.5 MB metadata size.
- `useractivated/dataset`, Kaggle, Pakistani Dishes Dataset, ODbL-1.0, 161.6 MB metadata size.

Local audit after download:

- `izbaiman/food-images`: 210 raw class folders, 208 normalized classes, 7,260 images, 390.1 MB local image bytes, 12-75 images per class.
- `useractivated/dataset`: 14 raw class folders, 14 normalized classes, 1,400 images, 83.1 MB local image bytes, exactly 100 images per class.
- Merged normalized set: 218 classes, 8,660 images, 473.2 MB local image bytes.
- Exact normalized overlap: `biryani`, `butter_chicken`, `chapati`, `chicken_tikka`.
- Merged imbalance: min 12 (`white_boiled_rice`), max 175 (`butter_chicken`), ratio 14.58x.

Full per-class counts are in `ml/reports/dataset_audit.md` and `ml/reports/dataset_audit.json`.

## Data Quality Notes

- `useractivated/dataset` is confirmed as a Pakistani dishes classification dataset, 14 classes with 100 images each.
- `izbaiman/food-images` is valid folder-per-class image classification data, but it is broader than Pakistani food and contains typos/noisy classes, near-duplicates, and checkpoint folders. The prep script ignores `.ipynb_checkpoints`.
- Because the merged class space is large and uneven, first training should establish an honest baseline before any class pruning.

## Training Plan

Baseline:

- Architecture: `yolov8n-cls.pt`
- Image size: 224
- Epochs: 50
- Split: stratified 80/20 train/val
- Deduplication: SHA-1 exact-file dedupe before split

If baseline accuracy is weak, train `yolov8s-cls.pt` with the same split.

## Metrics

Run `yolov8n_cls_218`, 2026-06-28. Free Colab T4, 50 epochs, 224px, batch 64.
Trained on 217 classes / 8,573 images (6,858 train + 1,715 val) — one ultra-rare
class (`white_boiled_rice` family, 1 image) could not be stratified into both
splits and dropped out; the `_218` run name is historical.

| Model | Classes | Top-1 | Top-5 | Epochs | imgsz | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `yolov8n-cls.pt` | 217 | 0.5848 | 0.8659 | 50 | 224 | Honest baseline |
| `yolov8s-cls.pt` | — | TBD | TBD | — | — | Optional next step; not run for P1 |

### Error analysis (honest)

Per-class recall (`ml/reports/per_class_recall.csv`) shows the top-1 gap is the
under-sampled long tail, not a modeling failure:

- **Strongest (well-sampled):** biryani 0.93 (30 val), chai 1.00 (20), samosa
  1.00 (20), sheer_korma 0.90 (10).
- **Weakest:** every 0.00-recall class has ≤5 validation images (~≤20 training
  images): e.g. `barbecue_chicken`, `chicken_kabsa`, `koskosi_fish`,
  `chicken_tikka_masala`, `maqluba`.
- Caveat: most 1.00-recall classes have only 5 val images (5/5, small sample);
  the trustworthy wins are the 20-30 image classes above.
- This is the direct consequence of the documented 14.58x class imbalance. The
  fix is more data per class or `yolov8s-cls`, not silently pruning hard classes.

Qualitative check on a held-out photo: real Haleem photo →
`haleem (0.86)` top-1, agreeing with the live Gemini path (`haleem 0.98`).

## Artifacts

Produced by the run, saved on Google Drive under `MyDrive/pakalorie_ml/`:

- `runs/yolov8n_cls_218/weights/best.pt` (3.5 MB) and `best.onnx` (6.6 MB)
- `runs/yolov8n_cls_218_eval/confusion_matrix_normalized.png`
- `reports/eval_metrics.json` (top-1 0.5848, top-5 0.8659)
- `reports/per_class_recall.csv` (per-class error analysis)
- `reports/qualitative_predictions.md` (held-out photo predictions)

The 3.5 MB `best.pt` / 6.6 MB `best.onnx` are small enough to commit; mirror
them into `ml/artifacts/checkpoints/` and the reports into `ml/reports/` so the
repo is the source of truth for the FYP submission.
