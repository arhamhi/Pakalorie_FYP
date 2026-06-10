# Pakalorie YOLOv8 Food Classifier Model Card

Status: pre-training dataset audit complete, model training pending.

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

Training has not been run yet.

| Model | Top-1 | Top-5 | Notes |
| --- | ---: | ---: | --- |
| `yolov8n-cls.pt` | TBD | TBD | Pending Colab run |
| `yolov8s-cls.pt` | TBD | TBD | Run only if nano is weak |

## Artifacts

Expected after training:

- `best.pt`
- `best.onnx`
- confusion matrix image
- `ml/reports/eval_metrics.json`
- sample predictions on Arham's own held-out food photos

Do not commit large weights directly if they make the repo heavy. Prefer a release or Drive link and keep this model card updated with the exact artifact location.
