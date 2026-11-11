"""Quantize best.onnx and compare size, latency and (optionally) accuracy.

Usage (from repo root):
  python ml/scripts/quantize.py                       # size + latency only
  python ml/scripts/quantize.py --data DIR            # + accuracy; DIR/<class_name>/*.jpg
  python ml/scripts/quantize.py --data DIR --calib 200 --limit 3000

Preprocessing matches backend/app/services/yolo_recognition.py: RGB, direct
bilinear resize to 224x224, /255, NCHW float32.
Writes variants next to the source model and ml/reports/quantization.md.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from onnxruntime.quantization import (
    CalibrationDataReader,
    QuantFormat,
    QuantType,
    quantize_dynamic,
    quantize_static,
)
from PIL import Image

SIZE = 224
ROOT = Path(__file__).resolve().parents[2]
CKPT = ROOT / "ml" / "artifacts" / "checkpoints"
REPORT = ROOT / "ml" / "reports" / "quantization.md"
EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def load(path: Path) -> np.ndarray:
    img = Image.open(path).convert("RGB").resize((SIZE, SIZE), Image.Resampling.BILINEAR)
    return np.expand_dims(np.asarray(img, dtype=np.float32).transpose(2, 0, 1) / 255.0, 0)


def collect(data: Path, names: list[str]) -> list[tuple[Path, int]]:
    index = {n: i for i, n in enumerate(names)}
    items = []
    for d in sorted(p for p in data.iterdir() if p.is_dir()):
        if d.name in index:
            items += [(f, index[d.name]) for f in d.iterdir() if f.suffix.lower() in EXTS]
    return items


class Reader(CalibrationDataReader):
    def __init__(self, files: list[Path]):
        self.it = iter(files)

    def get_next(self):
        f = next(self.it, None)
        return None if f is None else {"images": load(f)}


def session(path: Path) -> ort.InferenceSession:
    return ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])


def latency_ms(path: Path, runs: int = 50) -> float | None:
    try:
        s = session(path)
        x = np.random.rand(1, 3, SIZE, SIZE).astype(np.float32)
        for _ in range(5):
            s.run(None, {"images": x})
        t = time.perf_counter()
        for _ in range(runs):
            s.run(None, {"images": x})
        return (time.perf_counter() - t) / runs * 1000
    except Exception as exc:  # unsupported op on this runtime
        print(f"  latency failed for {path.name}: {exc}")
        return None


def accuracy(path: Path, items: list[tuple[Path, int]]) -> tuple[float, float] | None:
    try:
        s = session(path)
    except Exception as exc:
        print(f"  accuracy failed for {path.name}: {exc}")
        return None
    top1 = top5 = 0
    for f, y in items:
        out = s.run(None, {"images": load(f)})[0][0]
        order = np.argsort(-out)[:5]
        top1 += int(order[0] == y)
        top5 += int(y in order)
    return top1 / len(items), top5 / len(items)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, help="folder of class-named subfolders")
    ap.add_argument("--calib", type=int, default=200)
    ap.add_argument("--limit", type=int, default=3000, help="max eval images")
    a = ap.parse_args()

    src = CKPT / "best.onnx"
    names = json.loads((CKPT / "class_names.json").read_text(encoding="utf-8"))
    variants = {"fp32 (baseline)": src}

    dyn = CKPT / "best.int8_dynamic.onnx"
    try:
        quantize_dynamic(str(src), str(dyn), weight_type=QuantType.QUInt8)
        variants["int8 dynamic"] = dyn
    except Exception as exc:
        print(f"dynamic quantization failed: {exc}")

    items: list[tuple[Path, int]] = []
    if a.data:
        items = collect(a.data, names)
        random.Random(0).shuffle(items)
        print(f"found {len(items)} labelled images")
        if len(items) > a.calib:
            calib = [f for f, _ in items[: a.calib]]
            stat = CKPT / "best.int8_static.onnx"
            quantize_static(
                str(src), str(stat), Reader(calib),
                quant_format=QuantFormat.QDQ,
                activation_type=QuantType.QUInt8, weight_type=QuantType.QInt8,
                per_channel=True,
            )
            variants["int8 static (QDQ)"] = stat
            items = items[a.calib : a.calib + a.limit]  # eval on images not used for calibration

    rows = []
    for label, p in variants.items():
        print(label)
        acc = accuracy(p, items) if items else None
        rows.append((label, p.stat().st_size / 1e6, latency_ms(p), acc))

    lines = [
        "# Quantization results", "",
        f"Source: `ml/artifacts/checkpoints/best.onnx` (YOLOv8n-cls, {len(names)} classes, 224x224). CPU, onnxruntime {ort.__version__}.",
        f"Latency: mean of 50 single-image runs on this machine. Accuracy: {len(items)} held-out images." if items
        else "Latency: mean of 50 single-image runs on this machine. Accuracy: NOT measured (no dataset supplied).",
        "", "| Variant | Size (MB) | Latency (ms) | Top-1 | Top-5 |", "|---|---|---|---|---|",
    ]
    for label, mb, ms, acc in rows:
        lines.append(
            f"| {label} | {mb:.2f} | {'n/a (unsupported)' if ms is None else f'{ms:.1f}'} | "
            f"{'n/a' if acc is None else f'{acc[0]:.3f}'} | {'n/a' if acc is None else f'{acc[1]:.3f}'} |"
        )
    if items:
        lines += [
            "",
            "Read the accuracy columns as a *comparison between variants*, not as the model's true held-out accuracy.",
            "The split is rebuilt locally with `prepare_dataset.py` (seed 42). The shipped model was trained on a",
            "slightly different class set (the model card says 218 classes, this checkpoint has 217), so these images",
            "can overlap its training data. That is why the baseline here is higher than the official top-1 of 0.585",
            "in `ml/MODELCARD.md`. The official numbers stay the ones to cite for absolute accuracy.",
            "Calibration for static INT8 used 200 images that are excluded from the evaluation set.",
        ]
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
