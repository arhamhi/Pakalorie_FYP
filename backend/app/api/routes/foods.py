from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import envelope
from app.db.session import get_session
from app.schemas.common import ApiResponse
from app.schemas.food import FoodDetail, FoodSearchResult, NutritionRequest, NutritionResponse
from app.services.food_service import (
    calculate_food_nutrition,
    food_detail,
    get_food_or_404,
    search_foods,
)

router = APIRouter(prefix="/foods", tags=["foods"])


@router.get("/search", response_model=ApiResponse[list[FoodSearchResult]])
async def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(default=10, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
):
    return envelope(await search_foods(session, q, limit))


@router.get("/{food_id}", response_model=ApiResponse[FoodDetail])
async def detail(food_id: str, session: AsyncSession = Depends(get_session)):
    food = await get_food_or_404(session, food_id)
    return envelope(food_detail(food))


@router.post("/{food_id}/nutrition", response_model=ApiResponse[NutritionResponse])
async def nutrition(
    food_id: str,
    request: NutritionRequest,
    session: AsyncSession = Depends(get_session),
):
    food = await get_food_or_404(session, food_id)
    return envelope(calculate_food_nutrition(food, request))
