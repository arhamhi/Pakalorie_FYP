from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.main import create_app
from app.services.yolo_recognition import YoloRecognizer, _humanize, _softmax

REPO_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = REPO_ROOT / "ml" / "artifacts" / "checkpoints" / "best.onnx"
NAMES_PATH = REPO_ROOT / "ml" / "artifacts" / "checkpoints" / "class_names.json"
TEST_IMAGE = REPO_ROOT.parent / "test_food.webp"  # repo's parent FYP folder root


def test_softmax_sums_to_one_and_peaks_on_largest_logit() -> None:
    probs = _softmax(np.array([1.0, 2.0, 5.0, 0.0], dtype=np.float32))
    assert abs(float(probs.sum()) - 1.0) < 1e-6
    assert int(probs.argmax()) == 2


def test_humanize_makes_snake_case_class_names_readable() -> None:
    assert _humanize("chicken_biryani") == "Chicken Biryani"
    assert _humanize("haleem") == "Haleem"


def test_recognize_endpoint_returns_503_when_model_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.api.routes.recognition.get_settings",
        lambda: Settings(YOLO_MODEL_PATH="models/does-not-exist.onnx"),
    )
    client = TestClient(create_app())

    response = client.post(
        "/recognize",
        files={"image": ("food.jpg", b"fake-image-bytes", "image/jpeg")},
        data={"engine": "yolo"},
    )

    assert response.status_code == 503
    body = response.json()
    assert body["success"] is False
    assert "YOLO model not found" in body["error"]


@pytest.mark.skipif(
    not (MODEL_PATH.is_file() and NAMES_PATH.is_file() and TEST_IMAGE.is_file()),
    reason="trained YOLO artifacts or test image not present",
)
def test_real_yolo_inference_identifies_haleem() -> None:
    recognizer = YoloRecognizer(
        Settings(YOLO_MODEL_PATH=str(MODEL_PATH), YOLO_CLASS_NAMES_PATH=str(NAMES_PATH))
    )
    result = recognizer.recognize(TEST_IMAGE.read_bytes())

    # test_food.webp is Haleem; the model ranks it #1 (~0.57, calibrated probs,
    # not the flattened near-uniform value that a double-softmax would give).
    assert result.food_label == "Haleem"
    assert 0.5 < result.confidence <= 1.0
    assert len(result.alternatives) == 4
