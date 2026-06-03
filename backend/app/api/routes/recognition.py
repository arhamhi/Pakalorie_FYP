from fastapi import APIRouter, File, UploadFile

from app.core.config import get_settings
from app.core.responses import envelope
from app.schemas.common import ApiResponse
from app.schemas.recognition import RecognitionResponse
from app.services.recognition import RecognitionService

router = APIRouter(tags=["recognition"])


@router.post("/recognize", response_model=ApiResponse[RecognitionResponse])
async def recognize(image: UploadFile = File(...)):
    image_bytes = await image.read()
    service = RecognitionService(get_settings())
    result = await service.recognize(image_bytes, image.content_type)
    return envelope(result)
