from decimal import Decimal

from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.constants import TRIGRAM_SIMILARITY_THRESHOLD
from app.db.models import Food, FoodAlias, PortionSize


async def retrieve_foods(
    session: AsyncSession, label: str, top_k: int
) -> list[tuple[Food, float | None]]:
    query = label.strip()
    if not query:
        return []

    alias_score = func.coalesce(func.max(func.similarity(FoodAlias.alias, query)), 0)
    score = func.greatest(
        func.similarity(Food.name_en, query),
        func.similarity(func.coalesce(Food.name_ur, ""), query),
        alias_score,
    )
    like = f"%{query}%"

    stmt = (
        select(Food, score.label("score"))
        .outerjoin(FoodAlias, FoodAlias.food_id == Food.id)
        .where(
            or_(
                Food.name_en.ilike(like),
                Food.name_ur.ilike(like),
                FoodAlias.alias.ilike(like),
                func.similarity(Food.name_en, query) > TRIGRAM_SIMILARITY_THRESHOLD,
                func.similarity(func.coalesce(Food.name_ur, ""), query)
                > TRIGRAM_SIMILARITY_THRESHOLD,
                func.similarity(FoodAlias.alias, query) > TRIGRAM_SIMILARITY_THRESHOLD,
            )
        )
        .group_by(Food.id)
        .order_by(desc("score"), Food.source, Food.name_en)
        .limit(top_k)
        .options(
            selectinload(Food.aliases),
            selectinload(Food.portions).selectinload(PortionSize.nutrition),
            selectinload(Food.modifiers),
        )
    )
    rows = (await session.execute(stmt)).all()
    return [
        (food, float(score_value) if isinstance(score_value, Decimal) else score_value)
        for food, score_value in rows
    ]
