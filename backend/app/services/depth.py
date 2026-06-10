"""MiDaS relative-depth -> portion-bucket estimation (CDX-007).

Deliberately minimal scope: a pretrained MiDaS v2.1 small ONNX model produces
a RELATIVE inverse-depth map (larger value = closer to the camera). A single
uncalibrated phone photo cannot yield absolute volume or grams, so this module
only maps coarse depth-shape heuristics to a portion bucket (small/medium/
large) with a kcal multiplier the calorie engine can consume. Methodology and
limitations: docs/DEPTH_NOTES.md.
"""

from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import numpy as np
from fastapi import HTTPException, status

from app.core.settings import Settings
from app.schemas.depth import DepthStats, PortionEstimate

MIDAS_MODEL_NAME = "midas_v21_small_256"
MIDAS_INPUT_SIZE = 256
MIDAS_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
MIDAS_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# Heuristic constants. Tuned by eyeball on a handful of food photos, not
# calibrated on a labeled portion dataset - documented as such in DEPTH_NOTES.
CENTER_BOX_FRACTION = 0.5  # central 50% x 50% box ~= where the dish sits
BORDER_MARGIN_FRACTION = 0.1  # outer 10% ring ~= table/background
NEAR_BAND_FRACTION = 0.75  # pixels above min + 75% of range count as the mound
FLAT_RANGE_EPSILON = 1e-4  # below this depth range the map is degenerate
SMALL_MAX_SCORE = 0.15
LARGE_MIN_SCORE = 0.45
BUCKET_MULTIPLIERS = {"small": 0.75, "medium": 1.0, "large": 1.3}

LIMITATIONS_NOTE = (
    "MiDaS gives RELATIVE depth from one uncalibrated photo: no absolute scale, "
    "no grams. The bucket comes from a documented heuristic (mound prominence + "
    "near-pixel fill), not a measured volume. Treat it as a coarse portion hint."
)

_session_lock = Lock()
_session_cache: dict[str, object] = {}


@dataclass(frozen=True)
class HeuristicStats:
    center_mean: float
    border_mean: float
    prominence: float
    near_fill_fraction: float
    score: float
    degenerate: bool


def compute_heuristic_stats(depth: np.ndarray) -> HeuristicStats:
    """Pure scoring over a normalized [0, 1] inverse-depth map (closer = bigger)."""
    height, width = depth.shape
    depth_range = float(depth.max() - depth.min())
    if depth_range < FLAT_RANGE_EPSILON:
        return HeuristicStats(0.0, 0.0, 0.0, 0.0, 0.0, degenerate=True)

    normalized = (depth - depth.min()) / depth_range

    box = CENTER_BOX_FRACTION / 2
    y0, y1 = int(height * (0.5 - box)), int(height * (0.5 + box))
    x0, x1 = int(width * (0.5 - box)), int(width * (0.5 + box))
    center_mean = float(normalized[y0:y1, x0:x1].mean())

    margin_y = max(1, int(height * BORDER_MARGIN_FRACTION))
    margin_x = max(1, int(width * BORDER_MARGIN_FRACTION))
    border_mask = np.zeros_like(normalized, dtype=bool)
    border_mask[:margin_y, :] = True
    border_mask[-margin_y:, :] = True
    border_mask[:, :margin_x] = True
    border_mask[:, -margin_x:] = True
    border_mean = float(normalized[border_mask].mean())

    prominence = max(0.0, center_mean - border_mean)
    near_fill = float((normalized >= NEAR_BAND_FRACTION).mean())
    score = 0.6 * near_fill + 0.4 * min(1.0, prominence)
    return HeuristicStats(
        center_mean=center_mean,
        border_mean=border_mean,
        prominence=prominence,
        near_fill_fraction=near_fill,
        score=score,
        degenerate=False,
    )


def bucket_from_stats(stats: HeuristicStats) -> tuple[str, float]:
    if stats.degenerate or stats.score <= SMALL_MAX_SCORE:
        bucket = "medium" if stats.degenerate else "small"
    elif stats.score >= LARGE_MIN_SCORE:
        bucket = "large"
    else:
        bucket = "medium"
    return bucket, BUCKET_MULTIPLIERS[bucket]


class DepthEstimator:
    def __init__(self, settings: Settings) -> None:
        self.model_path = Path(settings.midas_model_path)

    def estimate(self, image_bytes: bytes) -> PortionEstimate:
        # Resolve the model first: a missing model is the actionable setup
        # error (503) and must win over an undecodable image (422).
        session = self._get_session()
        depth = self._run_model(session, self._preprocess(image_bytes))
        stats = compute_heuristic_stats(depth)
        bucket, multiplier = bucket_from_stats(stats)
        why = self._why(stats, bucket)
        return PortionEstimate(
            bucket=bucket,
            multiplier=multiplier,
            depth_stats=DepthStats(
                center_mean=round(stats.center_mean, 4),
                border_mean=round(stats.border_mean, 4),
                prominence=round(stats.prominence, 4),
                near_fill_fraction=round(stats.near_fill_fraction, 4),
                score=round(stats.score, 4),
            ),
            why=why,
            limitations=LIMITATIONS_NOTE,
            model_used=MIDAS_MODEL_NAME,
        )

    def _preprocess(self, image_bytes: bytes) -> np.ndarray:
        try:
            from PIL import Image, UnidentifiedImageError
        except ImportError as exc:  # pragma: no cover - dependency is declared
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Pillow is not installed; reinstall backend dependencies",
            ) from exc
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except UnidentifiedImageError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not decode the uploaded image",
            ) from exc
        image = image.resize((MIDAS_INPUT_SIZE, MIDAS_INPUT_SIZE), Image.BILINEAR)
        pixels = np.asarray(image, dtype=np.float32) / 255.0
        pixels = (pixels - MIDAS_MEAN) / MIDAS_STD
        return np.expand_dims(pixels.transpose(2, 0, 1), axis=0)

    def _run_model(self, session: object, model_input: np.ndarray) -> np.ndarray:
        input_name = session.get_inputs()[0].name  # type: ignore[attr-defined]
        output = session.run(None, {input_name: model_input})[0]  # type: ignore[attr-defined]
        return np.squeeze(np.asarray(output, dtype=np.float32))

    def _get_session(self) -> object:
        key = str(self.model_path)
        with _session_lock:
            if key in _session_cache:
                return _session_cache[key]
            try:
                import onnxruntime as ort
            except ImportError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="onnxruntime is not installed; reinstall backend dependencies",
                ) from exc
            if not self.model_path.is_file():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=(
                        f"MiDaS model not found at '{self.model_path}'. "
                        "Run: python -m scripts.download_midas"
                    ),
                )
            session = ort.InferenceSession(str(self.model_path), providers=["CPUExecutionProvider"])
            _session_cache[key] = session
            return session

    @staticmethod
    def _why(stats: HeuristicStats, bucket: str) -> str:
        if stats.degenerate:
            return (
                "Depth map was nearly flat (no discernible mound), so the portion "
                "defaults to medium."
            )
        return (
            f"Relative depth shows a mound prominence of {stats.prominence:.2f} and "
            f"{stats.near_fill_fraction:.0%} of pixels in the nearest depth band, "
            f"scoring {stats.score:.2f} -> {bucket} portion."
        )
