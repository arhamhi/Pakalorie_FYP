from __future__ import annotations

import argparse
from pathlib import Path

from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser(description="Train a YOLOv8 classification model.")
    parser.add_argument("--data", type=Path, required=True, help="Prepared dataset root with train/ and val/.")
    parser.add_argument("--model", default="yolov8n-cls.pt", help="Ultralytics classification checkpoint.")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=224)
    parser.add_argument("--batch", type=int, default=64)
    parser.add_argument("--device", default=None, help="Example: 0 for CUDA, cpu for CPU.")
    parser.add_argument("--project", type=Path, default=Path("ml/runs"))
    parser.add_argument("--name", default="yolov8n_cls")
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume optimizer and epoch state from --model checkpoint.",
    )
    args = parser.parse_args()

    model = YOLO(args.model)
    if args.resume:
        train_kwargs = {
            "resume": True,
            "epochs": args.epochs,
        }
    else:
        train_kwargs = {
            "data": str(args.data),
            "epochs": args.epochs,
            "imgsz": args.imgsz,
            "batch": args.batch,
            "project": str(args.project),
            "name": args.name,
        }
        if args.device is not None:
            train_kwargs["device"] = args.device

    results = model.train(**train_kwargs)
    save_dir = Path(getattr(results, "save_dir", model.trainer.save_dir))
    best = save_dir / "weights" / "best.pt"
    if best.exists():
        YOLO(str(best)).export(format="onnx", imgsz=args.imgsz)
    print(f"Training run saved to: {save_dir}")


if __name__ == "__main__":
    main()
