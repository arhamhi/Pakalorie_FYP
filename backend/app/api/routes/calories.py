from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.responses import envelope
from app.db.session import get_session
from app.schemas.calorie import CalorieBreakdown, CalorieRequest
from app.schemas.common import ApiResponse
from app.services.calorie_engine import CalorieEngine

router = APIRouter(tags=["calories"])


@router.post("/calories", response_model=ApiResponse[CalorieBreakdown])
async def calories(request: CalorieRequest, session: AsyncSession = Depends(get_session)):
    engine = CalorieEngine(get_settings())
    return envelope(await engine.calculate(session, request))
