from fastapi import APIRouter, File, Form, UploadFile

from app.core.config import get_settings
from app.core.responses import envelope
from app.schemas.common import ApiResponse
from app.schemas.recognition import RecognitionResponse
from app.services.recognition import Engine, RecognitionService

router = APIRouter(tags=["recognition"])


@router.post("/recognize", response_model=ApiResponse[RecognitionResponse])
async def recognize(
    image: UploadFile = File(...),
    engine: Engine = Form("gemini"),
):
    """Identify the dish. `engine=gemini` (default, recommended) uses the
    server-side Gemini vision model; `engine=yolo` runs our own trained
    YOLOv8-cls model (demo of our model — 217 classes, lower accuracy). Both
    return the same RecognitionResponse shape."""
    image_bytes = await image.read()
    service = RecognitionService(get_settings())
    result = await service.recognize(image_bytes, image.content_type, engine)
    return envelope(result)
