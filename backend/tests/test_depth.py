import io
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.main import create_app
from app.schemas.calorie import CalorieBreakdown
from app.services.calorie_engine import _apply_portion_multiplier
from app.services.depth import (
    DepthEstimator,
    bucket_from_stats,
    compute_heuristic_stats,
)

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "midas_small_256.onnx"


def _disk_map(radius: int, height: float, background: float = 0.2) -> np.ndarray:
    depth = np.full((256, 256), background, dtype=np.float32)
    yy, xx = np.ogrid[:256, :256]
    depth[(yy - 128) ** 2 + (xx - 128) ** 2 <= radius**2] = height
    return depth


def test_flat_depth_map_is_degenerate_and_defaults_to_medium() -> None:
    stats = compute_heuristic_stats(np.full((256, 256), 0.5, dtype=np.float32))

    assert stats.degenerate is True
    bucket, multiplier = bucket_from_stats(stats)
    assert bucket == "medium"
    assert multiplier == 1.0


def test_small_mound_maps_to_small_bucket() -> None:
    stats = compute_heuristic_stats(_disk_map(radius=30, height=0.9))

    bucket, multiplier = bucket_from_stats(stats)
    assert bucket == "small"
    assert multiplier == 0.75


def test_medium_mound_maps_to_medium_bucket() -> None:
    stats = compute_heuristic_stats(_disk_map(radius=60, height=0.7))

    bucket, multiplier = bucket_from_stats(stats)
    assert bucket == "medium"
    assert multiplier == 1.0


def test_large_mound_maps_to_large_bucket() -> None:
    stats = compute_heuristic_stats(_disk_map(radius=100, height=0.9))

    bucket, multiplier = bucket_from_stats(stats)
    assert bucket == "large"
    assert multiplier == 1.3


def test_portion_endpoint_returns_503_when_model_missing(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.api.routes.depth.get_settings",
        lambda: Settings(MIDAS_MODEL_PATH="models/does-not-exist.onnx"),
    )
    client = TestClient(create_app())

    response = client.post(
        "/portion",
        files={"image": ("food.jpg", b"fake-image-bytes", "image/jpeg")},
    )

    assert response.status_code == 503
    body = response.json()
    assert body["success"] is False
    assert "scripts.download_midas" in body["error"]


def test_apply_portion_multiplier_scales_macros_and_notes_why() -> None:
    breakdown = _breakdown(calories=300.0, protein=20.0, fiber=None)

    scaled = _apply_portion_multiplier(breakdown, 1.3)

    assert scaled.calories_kcal == 390.0
    assert scaled.protein_g == 26.0
    assert scaled.fiber_g is None
    assert scaled.applied_portion_multiplier == 1.3
    assert "x1.3" in scaled.why
    # Original is untouched (immutability) and a no-op multiplier returns as-is.
    assert breakdown.calories_kcal == 300.0
    assert _apply_portion_multiplier(breakdown, None) is breakdown
    assert _apply_portion_multiplier(breakdown, 1.0) is breakdown


@pytest.mark.skipif(not MODEL_PATH.is_file(), reason="MiDaS model not downloaded")
def test_real_midas_inference_returns_valid_bucket() -> None:
    from PIL import Image, ImageDraw

    image = Image.new("RGB", (640, 480), (200, 190, 180))
    draw = ImageDraw.Draw(image)
    draw.ellipse((140, 90, 500, 390), fill=(120, 70, 30))  # plate-sized blob
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")

    estimator = DepthEstimator(Settings(MIDAS_MODEL_PATH=str(MODEL_PATH)))
    result = estimator.estimate(buffer.getvalue())

    assert result.bucket in {"small", "medium", "large"}
    assert result.multiplier in {0.75, 1.0, 1.3}
    assert result.model_used == "midas_v21_small_256"
    assert 0.0 <= result.depth_stats.score <= 1.0
    assert "RELATIVE depth" in result.limitations


def _breakdown(*, calories: float, protein: float, fiber: float | None) -> CalorieBreakdown:
    return CalorieBreakdown(
        food_id="meat_01",
        food_label="Nihari (Beef/Mutton)",
        portion_label="Standard Bowl",
        calories_kcal=calories,
        protein_g=protein,
        carbs_g=4.0,
        fat_g=17.0,
        fiber_g=fiber,
        applied_modifiers=[],
        ignored_modifiers=[],
        why="Matched Nihari and used its Standard Bowl row.",
        model_used="local_grounded_fallback",
        source_rows=[],
    )
