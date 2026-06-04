from __future__ import annotations

import argparse
import json
from pathlib import Path

from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate a YOLOv8 classification checkpoint.")
    parser.add_argument("--weights", type=Path, required=True)
    parser.add_argument("--data", type=Path, required=True, help="Prepared dataset root with train/ and val/.")
    parser.add_argument("--imgsz", type=int, default=224)
    parser.add_argument("--batch", type=int, default=64)
    parser.add_argument("--device", default=None)
    parser.add_argument("--project", type=Path, default=Path("ml/runs"))
    parser.add_argument("--name", default="eval")
    parser.add_argument("--json-out", type=Path, default=Path("ml/reports/eval_metrics.json"))
    args = parser.parse_args()

    model = YOLO(str(args.weights))
    val_kwargs = {
        "data": str(args.data),
        "imgsz": args.imgsz,
        "batch": args.batch,
        "project": str(args.project),
        "name": args.name,
        "plots": True,
    }
    if args.device is not None:
        val_kwargs["device"] = args.device

    metrics = model.val(**val_kwargs)
    payload = {
        "weights": str(args.weights),
        "data": str(args.data),
        "top1": float(metrics.top1),
        "top5": float(metrics.top5),
        "save_dir": str(metrics.save_dir),
    }
    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
