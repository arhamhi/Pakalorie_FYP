# Pakalorie YOLOv8 Classification

CDX-006 trains a YOLOv8 classification model on the two Kaggle food datasets Arham provided:

- `izbaiman/food-images`
- `useractivated/dataset`

The live app still uses the server-side Gemini recognition path until this model is trained, evaluated, reviewed, and intentionally wired later.

## Dataset Audit

Download the Kaggle datasets into a scratch folder, not into git:

```powershell
uvx kaggle datasets download izbaiman/food-images -p .tmp/kaggle/izbaiman-food-images --unzip
uvx kaggle datasets download useractivated/dataset -p .tmp/kaggle/useractivated-dataset --unzip
```

Generate the audit:

```powershell
python ml/scripts/prepare_dataset.py `
  --source izbaiman/food-images=.tmp/kaggle/izbaiman-food-images/dataset `
  --source useractivated/dataset=.tmp/kaggle/useractivated-dataset/dataset/dataset `
  --audit-only `
  --audit-json ml/reports/dataset_audit.json `
  --audit-markdown ml/reports/dataset_audit.md `
  --class-counts-csv ml/reports/class_counts.csv
```

## Prepare Train/Val

```powershell
python ml/scripts/prepare_dataset.py `
  --source izbaiman/food-images=.tmp/kaggle/izbaiman-food-images/dataset `
  --source useractivated/dataset=.tmp/kaggle/useractivated-dataset/dataset/dataset `
  --output .tmp/ml/food-cls-224 `
  --audit-json ml/reports/dataset_audit.json `
  --audit-markdown ml/reports/dataset_audit.md `
  --class-counts-csv ml/reports/class_counts.csv `
  --imgsz 224 `
  --val-ratio 0.2 `
  --seed 42
```

The output layout is Ultralytics-compatible:

```text
.tmp/ml/food-cls-224/
  train/<class>/*.jpg
  val/<class>/*.jpg
  manifest.csv
```

## Train

Colab free T4 is the target compute path:

```powershell
pip install -r ml/requirements.txt
python ml/scripts/train.py --data .tmp/ml/food-cls-224 --model yolov8n-cls.pt --epochs 50 --imgsz 224 --batch 64 --device 0
```

If `yolov8n-cls.pt` is weak, rerun with:

```powershell
python ml/scripts/train.py --data .tmp/ml/food-cls-224 --model yolov8s-cls.pt --epochs 50 --imgsz 224 --batch 64 --device 0 --name yolov8s_cls
```

## Evaluate

```powershell
python ml/scripts/evaluate.py --weights ml/runs/yolov8n_cls/weights/best.pt --data .tmp/ml/food-cls-224 --device 0
```

Update `ml/MODELCARD.md` with top-1/top-5 accuracy, confusion matrix path, and sample predictions on Arham's own held-out food photos after training.
