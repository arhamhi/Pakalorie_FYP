from typing import Literal

from starlette.concurrency import run_in_threadpool

from app.core.settings import Settings
from app.schemas.recognition import RecognitionAlternative, RecognitionResponse
from app.services.gemini import GeminiClient
from app.services.yolo_recognition import YoloRecognizer

Engine = Literal["gemini", "yolo"]

FOOD_IDENTIFICATION_PROMPT = """
You are an expert Pakistani and South Asian food nutritionist.

TASK:
Analyze the image and identify the most likely food dish. Return only JSON.

Rules:
1. Identify the exact dish where possible, for example "Chicken Biryani", not only "Biryani".
2. If multiple items are visible, identify the main dish and list alternatives.
3. Use Pakistani/South Asian dish names when relevant.
4. Confidence must be a number from 0 to 1.

Return exactly:
{
  "food_label": "Dish name in English",
  "confidence": 0.85,
  "alternatives": [
    {"food_label": "Alternative dish", "confidence": 0.5}
  ]
}

If the image is not food, return:
{
  "food_label": "Unknown",
  "confidence": 0,
  "alternatives": []
}
"""


class RecognitionService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.gemini = GeminiClient(settings)

    async def recognize(
        self,
        image_bytes: bytes,
        mime_type: str | None,
        engine: Engine = "gemini",
    ) -> RecognitionResponse:
        if engine == "yolo":
            # Our trained model runs synchronous CPU ONNX inference; keep the
            # event loop free. Same RecognitionResponse shape as the Gemini path.
            recognizer = YoloRecognizer(self.settings)
            return await run_in_threadpool(recognizer.recognize, image_bytes)
        return await self._recognize_gemini(image_bytes, mime_type)

    async def _recognize_gemini(
        self, image_bytes: bytes, mime_type: str | None
    ) -> RecognitionResponse:
        result = await self.gemini.generate_json(
            FOOD_IDENTIFICATION_PROMPT,
            image_bytes=image_bytes,
            mime_type=mime_type or "image/jpeg",
            temperature=0.2,
            max_output_tokens=512,
        )
        alternatives = [
            RecognitionAlternative(
                food_label=str(item.get("food_label") or item.get("name") or "Unknown"),
                confidence=_clamp(item.get("confidence")),
            )
            for item in result.get("alternatives", [])
            if isinstance(item, dict)
        ]
        return RecognitionResponse(
            food_label=str(result.get("food_label") or result.get("name") or "Unknown"),
            confidence=_clamp(result.get("confidence")) or 0,
            alternatives=alternatives,
        )


def _clamp(value: object) -> float | None:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    return min(1.0, max(0.0, number))
