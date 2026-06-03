from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.constants import TRIGRAM_SIMILARITY_THRESHOLD
from app.db.models import Food, FoodAlias, ModifierConstant, PortionSize
from app.schemas.food import (
    FoodDetail,
    FoodSearchResult,
    ModifierOut,
    NutritionRequest,
    NutritionResponse,
    PortionOut,
)


def _num(value: Decimal | int | float | None) -> float | None:
    return None if value is None else float(value)


def portion_out(portion: PortionSize) -> PortionOut:
    nutrition = portion.nutrition
    return PortionOut(
        id=portion.id,
        label=portion.label,
        weight_g=_num(portion.weight_g),
        is_default=portion.is_default,
        calories_kcal=_num(nutrition.calories_kcal) or 0,
        protein_g=_num(nutrition.protein_g) or 0,
        carbs_g=_num(nutrition.carbs_g) or 0,
        fat_g=_num(nutrition.fat_g) or 0,
        fiber_g=_num(nutrition.fiber_g),
    )


def modifier_out(modifier: ModifierConstant) -> ModifierOut:
    return ModifierOut(
        id=modifier.id,
        name=modifier.name,
        kcal_delta=_num(modifier.kcal_delta) or 0,
        description=modifier.description,
    )


def food_detail(food: Food) -> FoodDetail:
    portions = sorted(food.portions, key=lambda p: (not p.is_default, p.weight_g or 0, p.label))
    return FoodDetail(
        id=food.id,
        name_en=food.name_en,
        name_ur=food.name_ur,
        category=food.category,
        source=food.source,
        base_unit=food.base_unit,
        aliases=sorted({alias.alias for alias in food.aliases}),
        portions=[portion_out(portion) for portion in portions],
        modifiers=[
            modifier_out(modifier) for modifier in sorted(food.modifiers, key=lambda m: m.name)
        ],
    )


async def get_food_or_404(session: AsyncSession, food_id: str) -> Food:
    food = await session.get(
        Food,
        food_id,
        options=[
            selectinload(Food.aliases),
            selectinload(Food.portions).selectinload(PortionSize.nutrition),
            selectinload(Food.modifiers),
        ],
    )
    if food is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food not found")
    return food


async def search_foods(
    session: AsyncSession, query: str, limit: int = 10
) -> list[FoodSearchResult]:
    q = query.strip()
    if not q:
        return []

    alias_score = func.coalesce(func.max(func.similarity(FoodAlias.alias, q)), 0)
    score = func.greatest(
        func.similarity(Food.name_en, q),
        func.similarity(func.coalesce(Food.name_ur, ""), q),
        alias_score,
    )
    like = f"%{q}%"

    stmt = (
        select(Food, score.label("score"))
        .outerjoin(FoodAlias, FoodAlias.food_id == Food.id)
        .where(
            or_(
                Food.name_en.ilike(like),
                Food.name_ur.ilike(like),
                FoodAlias.alias.ilike(like),
                func.similarity(Food.name_en, q) > TRIGRAM_SIMILARITY_THRESHOLD,
                func.similarity(func.coalesce(Food.name_ur, ""), q) > TRIGRAM_SIMILARITY_THRESHOLD,
                func.similarity(FoodAlias.alias, q) > TRIGRAM_SIMILARITY_THRESHOLD,
            )
        )
        .group_by(Food.id)
        .order_by(desc("score"), Food.source, Food.name_en)
        .limit(limit)
        .options(selectinload(Food.portions).selectinload(PortionSize.nutrition))
    )
    rows = (await session.execute(stmt)).all()

    results: list[FoodSearchResult] = []
    for food, search_score in rows:
        default_portion = _default_portion(food.portions)
        results.append(
            FoodSearchResult(
                id=food.id,
                name_en=food.name_en,
                name_ur=food.name_ur,
                category=food.category,
                source=food.source,
                default_portion=portion_out(default_portion) if default_portion else None,
                score=_num(search_score),
            )
        )
    return results


def _default_portion(portions: list[PortionSize]) -> PortionSize | None:
    if not portions:
        return None
    return next((portion for portion in portions if portion.is_default), portions[0])


def calculate_food_nutrition(food: Food, request: NutritionRequest) -> NutritionResponse:
    portion = _match_portion(food.portions, request.portion)
    requested_modifiers = [modifier.strip() for modifier in request.modifiers if modifier.strip()]
    modifiers_by_name = {modifier.name.lower(): modifier for modifier in food.modifiers}

    selected_modifiers: list[ModifierConstant] = []
    invalid_modifiers: list[str] = []
    for modifier_name in requested_modifiers:
        modifier = modifiers_by_name.get(modifier_name.lower())
        if modifier is None:
            invalid_modifiers.append(modifier_name)
        else:
            selected_modifiers.append(modifier)

    if invalid_modifiers:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid modifier(s) for {food.name_en}: {', '.join(invalid_modifiers)}",
        )

    nutrition = portion.nutrition
    modifier_kcal = sum((modifier.kcal_delta for modifier in selected_modifiers), Decimal("0"))
    calories = nutrition.calories_kcal + modifier_kcal
    formula = f"{float(nutrition.calories_kcal):g} kcal"
    if selected_modifiers:
        formula += " + " + " + ".join(
            f"{modifier.name} ({float(modifier.kcal_delta):+g} kcal)"
            for modifier in selected_modifiers
        )

    return NutritionResponse(
        food_id=food.id,
        food_label=food.name_en,
        portion=portion_out(portion),
        modifiers=[modifier_out(modifier) for modifier in selected_modifiers],
        calories_kcal=float(calories),
        protein_g=float(nutrition.protein_g),
        carbs_g=float(nutrition.carbs_g),
        fat_g=float(nutrition.fat_g),
        fiber_g=_num(nutrition.fiber_g),
        formula=formula,
    )


def _match_portion(portions: list[PortionSize], portion_key: str) -> PortionSize:
    normalized = portion_key.strip().lower()
    for portion in portions:
        if str(portion.id) == normalized or portion.label.lower() == normalized:
            return portion
    labels = ", ".join(portion.label for portion in portions)
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=f"Invalid portion for this food. Allowed portions: {labels}",
    )
