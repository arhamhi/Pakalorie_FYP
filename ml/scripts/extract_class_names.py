"""Extract the authoritative, index-ordered class list for the trained YOLOv8-cls
model into ml/artifacts/checkpoints/class_names.json (CDX-009).

Source of truth: the `names` field embedded in best.onnx metadata. Ultralytics
writes model.names into the ONNX export alongside the classifier head, so the
metadata order is identical to the `output0` logit index order the server reads
back. Reading it from the ONNX file (the exact file the server loads) guarantees
that alignment without installing torch + ultralytics just to read a dict.

Cross-checks the count against ml/reports/per_class_recall.csv and fails loudly
on mismatch. Run: python -m scripts.extract_class_names  (from ml/), or
python ml/scripts/extract_class_names.py from the repo root.
"""

from __future__ import annotations

import ast
import csv
import json
from pathlib import Path

import onnxruntime as ort

ML_DIR = Path(__file__).resolve().parents[1]
ONNX_PATH = ML_DIR / "artifacts" / "checkpoints" / "best.onnx"
OUT_PATH = ML_DIR / "artifacts" / "checkpoints" / "class_names.json"
RECALL_CSV = ML_DIR / "reports" / "per_class_recall.csv"
EXPECTED_COUNT = 217


def extract_names() -> list[str]:
    session = ort.InferenceSession(str(ONNX_PATH), providers=["CPUExecutionProvider"])
    meta = session.get_modelmeta().custom_metadata_map
    if "names" not in meta:
        raise SystemExit(f"No 'names' key in {ONNX_PATH} metadata: {list(meta)}")
    names_map: dict[int, str] = ast.literal_eval(meta["names"])
    expected_keys = set(range(len(names_map)))
    if set(names_map.keys()) != expected_keys:
        missing = expected_keys - set(names_map.keys())
        raise SystemExit(f"ONNX names map has non-contiguous keys; missing: {sorted(missing)}")
    # Emit index-ordered so list[i] == logit index i in output0.
    return [names_map[i] for i in range(len(names_map))]


def recall_class_count() -> int | None:
    if not RECALL_CSV.is_file():
        return None
    with RECALL_CSV.open(newline="", encoding="utf-8") as fh:
        return sum(1 for _ in csv.reader(fh)) - 1  # minus header


def main() -> None:
    names = extract_names()
    if len(names) != EXPECTED_COUNT:
        raise SystemExit(f"Expected {EXPECTED_COUNT} classes, got {len(names)}")
    if len(set(names)) != len(names):
        raise SystemExit("Duplicate class names in ONNX metadata")

    recall_count = recall_class_count()
    if recall_count is not None and recall_count != EXPECTED_COUNT:
        raise SystemExit(
            f"per_class_recall.csv has {recall_count} classes, expected {EXPECTED_COUNT}"
        )

    OUT_PATH.write_text(json.dumps(names, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(names)} class names -> {OUT_PATH}")
    print(f"  cross-check per_class_recall.csv: {recall_count} classes (OK)")
    print(f"  index 0 = {names[0]!r} ... index {len(names) - 1} = {names[-1]!r}")


if __name__ == "__main__":
    main()
