# Quantization results

Source: `ml/artifacts/checkpoints/best.onnx` (YOLOv8n-cls, 217 classes, 224x224). CPU, onnxruntime 1.31.1.
Latency: mean of 50 single-image runs on this machine. Accuracy: 1516 held-out images.

| Variant | Size (MB) | Latency (ms) | Top-1 | Top-5 |
|---|---|---|---|---|
| fp32 (baseline) | 6.89 | 2.4 | 0.700 | 0.927 |
| int8 dynamic | 1.79 | 6.6 | 0.592 | 0.885 |
| int8 static (QDQ) | 1.89 | 2.1 | 0.663 | 0.925 |

Read the accuracy columns as a *comparison between variants*, not as the model's true held-out accuracy.
The split is rebuilt locally with `prepare_dataset.py` (seed 42). The shipped model was trained on a
slightly different class set (the model card says 218 classes, this checkpoint has 217), so these images
can overlap its training data. That is why the baseline here is higher than the official top-1 of 0.585
in `ml/MODELCARD.md`. The official numbers stay the ones to cite for absolute accuracy.
Calibration for static INT8 used 200 images that are excluded from the evaluation set.
