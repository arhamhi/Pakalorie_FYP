"""Server-side YOLOv8-cls food recognition (CDX-009).

Runs our own trained classifier (best.onnx, 217 Pakistani-food classes, top-1
0.5848 / top-5 0.8659) through onnxruntime, mirroring the MiDaS ONNX pattern in
app/services/depth.py. Exposed as the optional `engine=yolo` path on
POST /recognize; returns the SAME RecognitionResponse shape as the Gemini path
so the client never branches on engine.

This is a "show our own model" demo, NOT the recommended recognizer: it only
knows its 217 classes and is visibly less accurate than Gemini, which stays the
default. See DECISIONS.md (2026-06-29).
"""

from __future__ import annotations

import io
import json
from pathlib import Path
from threading import Lock

import numpy as np
from fastapi import HTTPException, status

from app.core.settings import Settings
from app.schemas.recognition import RecognitionAlternative, RecognitionResponse

YOLO_MODEL_NAME = "yolov8n_cls_pak217"
YOLO_INPUT_SIZE = 224  # matches the trained imgsz; ONNX input is [1, 3, 224, 224]
TOP_K = 5  # 1 primary label + up to 4 alternatives

# Per-process caches keyed by file path, guarded by one lock (low traffic; a
# single global lock is fine here — ponytail: per-key locks only if this ever
# becomes a hot path, which a demo toggle never will).
_lock = Lock()
_session_cache: dict[str, object] = {}
_names_cache: dict[str, list[str]] = {}


class YoloRecognizer:
    def __init__(self, settings: Settings) -> None:
        self.model_path = Path(settings.yolo_model_path)
        self.class_names_path = Path(settings.yolo_class_names_path)

    def recognize(self, image_bytes: bytes) -> RecognitionResponse:
        # Resolve model + labels first: a missing artifact is the actionable
        # setup error (503) and must win over an undecodable image (422).
        session = self._get_session()
        names = self._get_names()
        probs = self._run_model(session, self._preprocess(image_bytes))
        if probs.shape[0] != len(names):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    f"Model/labels mismatch: {probs.shape[0]} logits vs "
                    f"{len(names)} class names. Re-run extract_class_names."
                ),
            )

        # argsort descending, take TOP_K.
        top_idx = np.argsort(probs)[::-1][:TOP_K]
        labels = [(_humanize(names[i]), float(probs[i])) for i in top_idx]
        primary_label, primary_conf = labels[0]
        return RecognitionResponse(
            food_label=primary_label,
            confidence=round(primary_conf, 4),
            alternatives=[
                RecognitionAlternative(food_label=label, confidence=round(conf, 4))
                for label, conf in labels[1:]
            ],
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
        image = image.resize((YOLO_INPUT_SIZE, YOLO_INPUT_SIZE), Image.Resampling.BILINEAR)
        # YOLOv8-cls inference normalizes with mean=0/std=1, so /255 (what
        # ToTensor does) is the only scaling. RGB, CHW, float32, batch dim.
        pixels = np.asarray(image, dtype=np.float32) / 255.0
        return np.expand_dims(pixels.transpose(2, 0, 1), axis=0)

    def _run_model(self, session: object, model_input: np.ndarray) -> np.ndarray:
        input_name = session.get_inputs()[0].name  # type: ignore[attr-defined]
        output = session.run(None, {input_name: model_input})[0]  # type: ignore[attr-defined]
        out = np.squeeze(np.asarray(output, dtype=np.float32))
        # Our exported best.onnx already includes the softmax (output sums to 1,
        # all non-negative). Only apply softmax if a future re-export emits raw
        # logits instead — re-softmaxing probabilities flattens them to uniform.
        if out.min() >= 0.0 and abs(float(out.sum()) - 1.0) < 1e-3:
            return out
        return _softmax(out)

    def _get_session(self) -> object:
        key = str(self.model_path)
        with _lock:
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
                        f"YOLO model not found at '{self.model_path}'. "
                        "Mount ml/artifacts/checkpoints into the container "
                        "(see backend/docs/DEPLOY.md §4c)."
                    ),
                )
            try:
                session = ort.InferenceSession(
                    str(self.model_path), providers=["CPUExecutionProvider"]
                )
            except Exception as exc:  # corrupt/truncated model -> actionable 503, not 500
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Failed to load YOLO model from '{self.model_path}': {exc}",
                ) from exc
            _session_cache[key] = session
            return session

    def _get_names(self) -> list[str]:
        key = str(self.class_names_path)
        with _lock:
            if key in _names_cache:
                return _names_cache[key]
            if not self.class_names_path.is_file():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=(
                        f"Class names not found at '{self.class_names_path}'. "
                        "Run: python -m scripts.extract_class_names (from ml/)."
                    ),
                )
            try:
                names = json.loads(self.class_names_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Could not read class names from '{self.class_names_path}': {exc}",
                ) from exc
            if not isinstance(names, list) or not names:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Class names file '{self.class_names_path}' is not a non-empty list.",
                )
            _names_cache[key] = names
            return names


def _softmax(logits: np.ndarray) -> np.ndarray:
    shifted = logits - logits.max()
    exp = np.exp(shifted)
    return exp / exp.sum()


def _humanize(class_name: str) -> str:
    """`chicken_biryani` -> `Chicken Biryani` so the label reads naturally and
    fuzzy-matches the food DB the same way the Gemini path's labels do."""
    return class_name.replace("_", " ").title()
