from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.responses import envelope
from app.schemas.ai import (
    AdviceRequest,
    AdviceResponse,
    ChatRequest,
    ChatResponse,
    MealEstimateRequest,
    NutritionEstimate,
)
from app.schemas.common import ApiResponse
from app.services.coach import FALLBACK_ADVICE, CoachService

router = APIRouter(prefix="/ai", tags=["ai"])

MAX_IMAGE_BYTES = 8 * 1024 * 1024


@router.post("/chat", response_model=ApiResponse[ChatResponse])
async def chat(request: ChatRequest):
    """Ustad coach reply (Claude). `history` is the earlier turns, oldest first."""
    reply = await CoachService(get_settings()).chat(request)
    return envelope(ChatResponse(reply=reply))


@router.post("/advice", response_model=ApiResponse[AdviceResponse])
async def advice(request: AdviceRequest):
    """One-line nudge for the Home screen. Never fails: falls back to a fixed line."""
    try:
        text = await CoachService(get_settings()).advice(request)
    except HTTPException:
        text = FALLBACK_ADVICE
    return envelope(AdviceResponse(text=text))


@router.post("/meal-estimate", response_model=ApiResponse[NutritionEstimate])
async def meal_estimate(request: MealEstimateRequest):
    """Create Custom Meal: estimate nutrition from a name and description."""
    result = await CoachService(get_settings()).estimate_meal(request)
    return envelope(result)


@router.post("/identify", response_model=ApiResponse[NutritionEstimate])
async def identify(image: UploadFile = File(...)):
    """One-shot photo -> nutrition estimate (not DB-grounded). The scan screen
    uses this only when the /recognize + /calories pipeline fails."""
    image_bytes = await image.read()
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Image is too large")
    result = await CoachService(get_settings()).identify(image_bytes, image.content_type)
    return envelope(result)
