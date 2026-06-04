from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import re
import shutil
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterable


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
IGNORED_PARTS = {".ipynb_checkpoints", "__MACOSX"}


@dataclass(frozen=True)
class Source:
    ref: str
    root: Path


@dataclass(frozen=True)
class Sample:
    source_ref: str
    original_class: str
    class_name: str
    path: Path
    size_bytes: int
    sha1: str


def normalize_label(label: str) -> str:
    normalized = label.lower()
    normalized = re.sub(r"[^a-z0-9]+", "_", normalized)
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    return normalized or "unknown"


def parse_source(value: str) -> Source:
    if "=" not in value:
        raise argparse.ArgumentTypeError("--source must use DATASET_REF=PATH")
    ref, path = value.split("=", 1)
    ref = ref.strip()
    root = Path(path).expanduser()
    if not ref:
        raise argparse.ArgumentTypeError("dataset ref cannot be empty")
    if not root.exists():
        raise argparse.ArgumentTypeError(f"source path does not exist: {root}")
    return Source(ref=ref, root=root)


def is_image(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS


def should_ignore(path: Path) -> bool:
    return any(part in IGNORED_PARTS for part in path.parts)


def file_sha1(path: Path) -> str:
    digest = hashlib.sha1()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def iter_source_images(source: Source) -> Iterable[Sample]:
    for path in source.root.rglob("*"):
        if should_ignore(path) or not is_image(path):
            continue
        rel = path.relative_to(source.root)
        if len(rel.parts) < 2:
            continue
        original_class = rel.parts[0]
        yield Sample(
            source_ref=source.ref,
            original_class=original_class,
            class_name=normalize_label(original_class),
            path=path,
            size_bytes=path.stat().st_size,
            sha1=file_sha1(path),
        )


def collect_samples(sources: list[Source]) -> list[Sample]:
    samples: list[Sample] = []
    for source in sources:
        samples.extend(iter_source_images(source))
    return samples


def build_audit(samples: list[Sample], sources: list[Source]) -> dict:
    source_counts: dict[str, Counter[str]] = {source.ref: Counter() for source in sources}
    source_raw_counts: dict[str, Counter[str]] = {source.ref: Counter() for source in sources}
    source_bytes: Counter[str] = Counter()
    merged_counts: Counter[str] = Counter()
    merged_bytes: Counter[str] = Counter()
    raw_labels: dict[str, set[str]] = defaultdict(set)
    source_by_class: dict[str, Counter[str]] = defaultdict(Counter)

    for sample in samples:
        source_counts[sample.source_ref][sample.class_name] += 1
        source_raw_counts[sample.source_ref][sample.original_class] += 1
        source_bytes[sample.source_ref] += sample.size_bytes
        merged_counts[sample.class_name] += 1
        merged_bytes[sample.class_name] += sample.size_bytes
        raw_labels[sample.class_name].add(sample.original_class)
        source_by_class[sample.class_name][sample.source_ref] += 1

    class_values = list(merged_counts.values())
    source_payload = {}
    for source in sources:
        counts = source_counts[source.ref]
        values = list(counts.values())
        source_payload[source.ref] = {
            "root": str(source.root),
            "raw_class_count": len(source_raw_counts[source.ref]),
            "class_count": len(counts),
            "image_count": sum(counts.values()),
            "total_bytes": int(source_bytes[source.ref]),
            "min_count": min(values) if values else 0,
            "max_count": max(values) if values else 0,
            "classes": dict(sorted(counts.items())),
            "raw_classes": dict(sorted(source_raw_counts[source.ref].items())),
        }

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "image_extensions": sorted(IMAGE_EXTENSIONS),
        "ignored_parts": sorted(IGNORED_PARTS),
        "sources": source_payload,
        "merged": {
            "class_count": len(merged_counts),
            "image_count": sum(merged_counts.values()),
            "total_bytes": int(sum(merged_bytes.values())),
            "min_count": min(class_values) if class_values else 0,
            "max_count": max(class_values) if class_values else 0,
            "imbalance_ratio": (
                round(max(class_values) / min(class_values), 2)
                if class_values and min(class_values) > 0
                else None
            ),
            "overlap_classes": {
                class_name: dict(sorted(counts.items()))
                for class_name, counts in sorted(source_by_class.items())
                if len(counts) > 1
            },
            "classes": {
                class_name: {
                    "count": merged_counts[class_name],
                    "total_bytes": int(merged_bytes[class_name]),
                    "source_counts": dict(sorted(source_by_class[class_name].items())),
                    "raw_labels": sorted(raw_labels[class_name]),
                }
                for class_name in sorted(merged_counts)
            },
        },
    }


def write_audit_json(audit: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(audit, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_audit_markdown(audit: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    merged = audit["merged"]
    lines = [
        "# Kaggle Dataset Audit",
        "",
        f"Generated: `{audit['generated_at']}`",
        "",
        "## Summary",
        "",
        "| Scope | Raw folders | Normalized classes | Images | Size MB | Min/Class | Max/Class | Imbalance |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for ref, payload in audit["sources"].items():
        ratio = (
            round(payload["max_count"] / payload["min_count"], 2)
            if payload["min_count"]
            else "n/a"
        )
        lines.append(
            f"| `{ref}` | {payload['raw_class_count']} | {payload['class_count']} | "
            f"{payload['image_count']} | "
            f"{payload['total_bytes'] / 1024 / 1024:.1f} | {payload['min_count']} | "
            f"{payload['max_count']} | {ratio} |"
        )
    lines.append(
        f"| merged normalized | n/a | {merged['class_count']} | {merged['image_count']} | "
        f"{merged['total_bytes'] / 1024 / 1024:.1f} | {merged['min_count']} | "
        f"{merged['max_count']} | {merged['imbalance_ratio']} |"
    )

    lines.extend(
        [
            "",
            "## Overlap Classes",
            "",
            "| Normalized class | Source counts |",
            "| --- | --- |",
        ]
    )
    for class_name, counts in merged["overlap_classes"].items():
        source_counts = ", ".join(f"{source}: {count}" for source, count in counts.items())
        lines.append(f"| `{class_name}` | {source_counts} |")

    lines.extend(
        [
            "",
            "## Merged Per-Class Counts",
            "",
            "| Normalized class | Count | Raw labels | Source counts |",
            "| --- | ---: | --- | --- |",
        ]
    )
    for class_name, payload in merged["classes"].items():
        raw = ", ".join(f"`{label}`" for label in payload["raw_labels"])
        source_counts = ", ".join(
            f"{source}: {count}" for source, count in payload["source_counts"].items()
        )
        lines.append(f"| `{class_name}` | {payload['count']} | {raw} | {source_counts} |")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_class_counts_csv(audit: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=["class_name", "count", "total_bytes", "raw_labels", "source_counts"],
        )
        writer.writeheader()
        for class_name, payload in audit["merged"]["classes"].items():
            writer.writerow(
                {
                    "class_name": class_name,
                    "count": payload["count"],
                    "total_bytes": payload["total_bytes"],
                    "raw_labels": "|".join(payload["raw_labels"]),
                    "source_counts": json.dumps(payload["source_counts"], sort_keys=True),
                }
            )


def dedupe_samples(samples: list[Sample]) -> list[Sample]:
    seen: set[str] = set()
    deduped: list[Sample] = []
    for sample in samples:
        if sample.sha1 in seen:
            continue
        seen.add(sample.sha1)
        deduped.append(sample)
    return deduped


def split_samples(samples: list[Sample], val_ratio: float, seed: int) -> dict[str, list[Sample]]:
    rng = random.Random(seed)
    by_class: dict[str, list[Sample]] = defaultdict(list)
    for sample in samples:
        by_class[sample.class_name].append(sample)

    splits = {"train": [], "val": []}
    for class_name in sorted(by_class):
        class_samples = by_class[class_name]
        rng.shuffle(class_samples)
        if len(class_samples) < 2:
            val_count = 0
        else:
            val_count = max(1, round(len(class_samples) * val_ratio))
            val_count = min(val_count, len(class_samples) - 1)
        splits["val"].extend(class_samples[:val_count])
        splits["train"].extend(class_samples[val_count:])
    return splits


def save_image(src: Path, dest: Path, image_size: int) -> None:
    from PIL import Image, ImageOps

    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image = ImageOps.fit(image, (image_size, image_size), method=Image.Resampling.LANCZOS)
        image.save(dest, format="JPEG", quality=92, optimize=True)


def prepare_dataset(samples: list[Sample], output: Path, image_size: int, val_ratio: float, seed: int) -> None:
    output.mkdir(parents=True, exist_ok=True)
    deduped = dedupe_samples(samples)
    splits = split_samples(deduped, val_ratio=val_ratio, seed=seed)

    manifest_rows = []
    for split_name, split_samples in splits.items():
        for sample in split_samples:
            dest_name = f"{sample.path.stem}_{sample.sha1[:10]}.jpg"
            dest = output / split_name / sample.class_name / dest_name
            save_image(sample.path, dest, image_size=image_size)
            manifest_rows.append(
                {
                    "split": split_name,
                    "class_name": sample.class_name,
                    "source_ref": sample.source_ref,
                    "original_class": sample.original_class,
                    "original_path": str(sample.path),
                    "prepared_path": str(dest),
                    "sha1": sample.sha1,
                }
            )

    with (output / "manifest.csv").open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(manifest_rows[0].keys()))
        writer.writeheader()
        writer.writerows(manifest_rows)

    shutil.copyfile(output / "manifest.csv", output / "dataset_manifest.csv")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Audit and prepare the Pakalorie YOLOv8 classification dataset."
    )
    parser.add_argument(
        "--source",
        action="append",
        type=parse_source,
        required=True,
        help="Dataset source as DATASET_REF=PATH_TO_FOLDER_PER_CLASS_ROOT. Repeat per dataset.",
    )
    parser.add_argument("--output", type=Path, help="Output train/val directory for Ultralytics.")
    parser.add_argument("--audit-json", type=Path, help="Write audit JSON.")
    parser.add_argument("--audit-markdown", type=Path, help="Write audit Markdown.")
    parser.add_argument("--class-counts-csv", type=Path, help="Write merged class counts CSV.")
    parser.add_argument("--audit-only", action="store_true", help="Only audit, do not prepare images.")
    parser.add_argument("--imgsz", type=int, default=224, help="Prepared square image size.")
    parser.add_argument("--val-ratio", type=float, default=0.2, help="Validation split ratio.")
    parser.add_argument("--seed", type=int, default=42, help="Split random seed.")
    args = parser.parse_args()

    samples = collect_samples(args.source)
    audit = build_audit(samples, args.source)

    if args.audit_json:
        write_audit_json(audit, args.audit_json)
    if args.audit_markdown:
        write_audit_markdown(audit, args.audit_markdown)
    if args.class_counts_csv:
        write_class_counts_csv(audit, args.class_counts_csv)

    if not args.audit_only:
        if not args.output:
            parser.error("--output is required unless --audit-only is set")
        prepare_dataset(
            samples=samples,
            output=args.output,
            image_size=args.imgsz,
            val_ratio=args.val_ratio,
            seed=args.seed,
        )

    print(
        json.dumps(
            {
                "sources": {
                    ref: {
                        "classes": payload["class_count"],
                        "raw_folders": payload["raw_class_count"],
                        "images": payload["image_count"],
                        "size_mb": round(payload["total_bytes"] / 1024 / 1024, 1),
                    }
                    for ref, payload in audit["sources"].items()
                },
                "merged": {
                    "classes": audit["merged"]["class_count"],
                    "images": audit["merged"]["image_count"],
                    "size_mb": round(audit["merged"]["total_bytes"] / 1024 / 1024, 1),
                    "min_count": audit["merged"]["min_count"],
                    "max_count": audit["merged"]["max_count"],
                    "imbalance_ratio": audit["merged"]["imbalance_ratio"],
                },
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
