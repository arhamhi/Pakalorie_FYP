from decimal import Decimal

import pytest

from app.core.settings import Settings
from app.db.models import Food, ModifierConstant, NutritionFact, PortionSize
from app.schemas.calorie import CalorieRequest
from app.services.calorie_engine import CalorieEngine


@pytest.mark.asyncio
async def test_calorie_engine_uses_local_grounded_fallback(monkeypatch) -> None:
    food = _food()

    async def fake_retrieve_foods(*_args):
        return [(food, 0.91)]

    monkeypatch.setattr("app.services.calorie_engine.retrieve_foods", fake_retrieve_foods)

    engine = CalorieEngine(Settings(GEMINI_API_KEY=""))
    result = await engine.calculate(
        session=None,  # type: ignore[arg-type]
        request=CalorieRequest(
            recognized_dish="Chicken Biryani",
            portion="Large",
            modifiers=["restaurant", "not_a_real_modifier"],
        ),
    )

    assert result.model_used == "local_grounded_fallback"
    assert result.calories_kcal == 625
    assert result.protein_g == 29
    assert result.applied_modifiers == ["restaurant"]
    assert result.ignored_modifiers == ["not_a_real_modifier"]
    assert result.source_rows[0].source == "desi_v1"


def _food() -> Food:
    food = Food(
        id="rice_01",
        source="desi_v1",
        source_id="rice_01",
        name_en="Chicken Biryani",
        slug="rice_01-chicken-biryani",
        base_unit="grams",
    )
    small = _portion(food.id, 1, "Small", 100, 140, 7, 19, 4)
    large = _portion(food.id, 2, "Large", 350, 575, 29, 58, 19)
    food.portions = [small, large]
    food.modifiers = [
        ModifierConstant(id=1, food_id=food.id, name="restaurant", kcal_delta=Decimal("50"))
    ]
    return food


def _portion(
    food_id: str,
    portion_id: int,
    label: str,
    weight: int,
    kcal: int,
    protein: int,
    carbs: int,
    fat: int,
) -> PortionSize:
    portion = PortionSize(
        id=portion_id,
        food_id=food_id,
        label=label,
        weight_g=Decimal(str(weight)),
        is_default=portion_id == 1,
    )
    portion.nutrition = NutritionFact(
        id=portion_id,
        food_id=food_id,
        portion_id=portion_id,
        calories_kcal=Decimal(str(kcal)),
        protein_g=Decimal(str(protein)),
        carbs_g=Decimal(str(carbs)),
        fat_g=Decimal(str(fat)),
        fiber_g=None,
        portion_weight_g=Decimal(str(weight)),
    )
    return portion
