from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.db.models import Food, ModifierConstant, NutritionFact, PortionSize
from app.schemas.food import NutritionRequest
from app.services.food_service import calculate_food_nutrition


def test_calculate_food_nutrition_applies_additive_modifiers() -> None:
    food = _food()

    result = calculate_food_nutrition(
        food,
        NutritionRequest(portion="Standard Bowl", modifiers=["extra_tarri", "nalli"]),
    )

    assert result.calories_kcal == 360
    assert result.protein_g == 38
    assert result.carbs_g == 4
    assert result.fat_g == 17
    assert result.fiber_g is None
    assert result.formula == "255 kcal + extra_tarri (+60 kcal) + nalli (+45 kcal)"


def test_calculate_food_nutrition_rejects_foreign_modifier() -> None:
    food = _food()

    with pytest.raises(HTTPException) as exc:
        calculate_food_nutrition(food, NutritionRequest(portion="1", modifiers=["with_naan"]))

    assert exc.value.status_code == 422
    assert "Invalid modifier" in str(exc.value.detail)


def _food() -> Food:
    food = Food(
        id="meat_01",
        source="desi_v1",
        source_id="meat_01",
        name_en="Nihari (Beef/Mutton)",
        slug="meat_01-nihari",
        base_unit="grams",
    )
    portion = PortionSize(
        id=1,
        food_id=food.id,
        label="Standard Bowl",
        weight_g=Decimal("300"),
        is_default=True,
    )
    portion.nutrition = NutritionFact(
        id=1,
        food_id=food.id,
        portion_id=portion.id,
        calories_kcal=Decimal("255"),
        protein_g=Decimal("38"),
        carbs_g=Decimal("4"),
        fat_g=Decimal("17"),
        fiber_g=None,
        portion_weight_g=Decimal("300"),
    )
    food.portions = [portion]
    food.modifiers = [
        ModifierConstant(id=1, food_id=food.id, name="extra_tarri", kcal_delta=Decimal("60")),
        ModifierConstant(id=2, food_id=food.id, name="nalli", kcal_delta=Decimal("45")),
    ]
    return food
