import json
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import Settings
from app.db.models import Food, ModifierConstant, PortionSize
from app.schemas.calorie import CalorieBreakdown, CalorieRequest, RetrievedSourceRow
from app.services.gemini import GeminiClient
from app.services.retrieval import retrieve_foods


class CalorieEngine:
    def __init__(self, settings: Settings) -> None:
        self.gemini = GeminiClient(settings)

    async def calculate(self, session: AsyncSession, request: CalorieRequest) -> CalorieBreakdown:
        retrieved = await retrieve_foods(session, request.recognized_dish, request.top_k)
        if not retrieved:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No nutrition rows found for '{request.recognized_dish}'",
            )

        source_rows = [
            _source_row(food, _choose_portion(food.portions, request.portion), score)
            for food, score in retrieved
            if food.portions
        ]
        if not source_rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No portion rows found for '{request.recognized_dish}'",
            )

        primary_food, _ = retrieved[0]
        primary_portion = _choose_portion(primary_food.portions, request.portion)
        applied, ignored = _match_modifiers(primary_food.modifiers, request.modifiers)
        nutrition = primary_portion.nutrition
        modifier_kcal = sum((modifier.kcal_delta for modifier in applied), Decimal("0"))
        calories = nutrition.calories_kcal + modifier_kcal

        if self.gemini.configured:
            breakdown = await self._gemini_breakdown(
                request=request,
                food=primary_food,
                portion=primary_portion,
                applied=applied,
                ignored=ignored,
                calories=calories,
                source_rows=source_rows,
            )
        else:
            breakdown = _fallback_breakdown(
                food=primary_food,
                portion=primary_portion,
                applied=applied,
                ignored=ignored,
                calories=calories,
                source_rows=source_rows,
            )
        return _apply_portion_multiplier(breakdown, request.portion_multiplier)

    async def _gemini_breakdown(
        self,
        *,
        request: CalorieRequest,
        food: Food,
        portion: PortionSize,
        applied: list[ModifierConstant],
        ignored: list[str],
        calories: Decimal,
        source_rows: list[RetrievedSourceRow],
    ) -> CalorieBreakdown:
        facts = [row.model_dump() for row in source_rows]
        prompt = f"""
You are Pakalorie's grounded calorie calculation engine.

Use ONLY the retrieved source rows below. Do not invent nutrition numbers.
Return one JSON object with:
food_label, portion_label, calories_kcal, protein_g, carbs_g, fat_g, fiber_g,
why.

Rules:
- Calories are the selected portion kcal plus additive modifier kcal constants.
- Protein/carbs/fat/fiber come from the selected portion row.
- If a modifier is not present in the source row, do not apply it.
- Keep why to one short sentence.

User request:
{request.model_dump_json()}

Selected calculation:
{{
  "food_label": "{food.name_en}",
  "portion_label": "{portion.label}",
  "base_calories_kcal": {float(portion.nutrition.calories_kcal)},
  "modifier_calories_kcal": {float(sum((m.kcal_delta for m in applied), Decimal("0")))},
  "final_calories_kcal": {float(calories)},
  "applied_modifiers": {[m.name for m in applied]},
  "ignored_modifiers": {ignored}
}}

Retrieved source rows:
{json.dumps(facts, ensure_ascii=False)}
"""
        result = await self.gemini.generate_json(prompt, temperature=0.1, max_output_tokens=768)
        return CalorieBreakdown(
            food_id=food.id,
            food_label=str(result.get("food_label") or food.name_en),
            portion_label=str(result.get("portion_label") or portion.label),
            calories_kcal=_float(result.get("calories_kcal"), calories),
            protein_g=_float(result.get("protein_g"), portion.nutrition.protein_g),
            carbs_g=_float(result.get("carbs_g"), portion.nutrition.carbs_g),
            fat_g=_float(result.get("fat_g"), portion.nutrition.fat_g),
            fiber_g=_float_or_none(result.get("fiber_g"), portion.nutrition.fiber_g),
            applied_modifiers=[modifier.name for modifier in applied],
            ignored_modifiers=ignored,
            why=str(result.get("why") or _why(food, portion, applied, ignored)),
            model_used="gemini_grounded",
            source_rows=source_rows,
        )


def _fallback_breakdown(
    *,
    food: Food,
    portion: PortionSize,
    applied: list[ModifierConstant],
    ignored: list[str],
    calories: Decimal,
    source_rows: list[RetrievedSourceRow],
) -> CalorieBreakdown:
    nutrition = portion.nutrition
    return CalorieBreakdown(
        food_id=food.id,
        food_label=food.name_en,
        portion_label=portion.label,
        calories_kcal=float(calories),
        protein_g=float(nutrition.protein_g),
        carbs_g=float(nutrition.carbs_g),
        fat_g=float(nutrition.fat_g),
        fiber_g=float(nutrition.fiber_g) if nutrition.fiber_g is not None else None,
        applied_modifiers=[modifier.name for modifier in applied],
        ignored_modifiers=ignored,
        why=_why(food, portion, applied, ignored),
        model_used="local_grounded_fallback",
        source_rows=source_rows,
    )


def _apply_portion_multiplier(
    breakdown: CalorieBreakdown, multiplier: float | None
) -> CalorieBreakdown:
    """Scale the grounded result by the MiDaS portion bucket, deterministically.

    Applied AFTER grounding (never inside the LLM prompt) so the arithmetic is
    exact and the un-scaled numbers stay visible in source_rows.
    """
    if multiplier is None or multiplier == 1.0:
        return breakdown
    return breakdown.model_copy(
        update={
            "calories_kcal": round(breakdown.calories_kcal * multiplier, 1),
            "protein_g": round(breakdown.protein_g * multiplier, 1),
            "carbs_g": round(breakdown.carbs_g * multiplier, 1),
            "fat_g": round(breakdown.fat_g * multiplier, 1),
            "fiber_g": (
                round(breakdown.fiber_g * multiplier, 1) if breakdown.fiber_g is not None else None
            ),
            "applied_portion_multiplier": multiplier,
            "why": (
                f"{breakdown.why} Scaled by x{multiplier:g} from the estimated "
                "portion size (depth-based bucket)."
            ),
        }
    )


def _choose_portion(portions: list[PortionSize], requested: str | None) -> PortionSize:
    if not portions:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food has no portions")
    ordered = sorted(portions, key=lambda p: (p.weight_g is None, p.weight_g or 0, p.label))
    default = next((portion for portion in ordered if portion.is_default), ordered[0])
    if not requested:
        return default

    key = requested.strip().lower()
    for portion in ordered:
        if str(portion.id) == key or portion.label.lower() == key:
            return portion

    if key in {"small", "medium", "large"}:
        if key == "small":
            return ordered[0]
        if key == "large":
            return ordered[-1]
        return ordered[len(ordered) // 2]

    return default


def _match_modifiers(
    available: list[ModifierConstant], requested: list[str]
) -> tuple[list[ModifierConstant], list[str]]:
    by_name = {modifier.name.lower(): modifier for modifier in available}
    applied: list[ModifierConstant] = []
    ignored: list[str] = []
    for modifier_name in [item.strip() for item in requested if item.strip()]:
        modifier = by_name.get(modifier_name.lower())
        if modifier is None:
            ignored.append(modifier_name)
        else:
            applied.append(modifier)
    return applied, ignored


def _source_row(food: Food, portion: PortionSize, score: float | None) -> RetrievedSourceRow:
    nutrition = portion.nutrition
    return RetrievedSourceRow(
        food_id=food.id,
        food_label=food.name_en,
        source=food.source,
        portion_id=portion.id,
        portion_label=portion.label,
        weight_g=float(portion.weight_g) if portion.weight_g is not None else None,
        calories_kcal=float(nutrition.calories_kcal),
        protein_g=float(nutrition.protein_g),
        carbs_g=float(nutrition.carbs_g),
        fat_g=float(nutrition.fat_g),
        fiber_g=float(nutrition.fiber_g) if nutrition.fiber_g is not None else None,
        modifiers=[
            {"name": modifier.name, "kcal_delta": float(modifier.kcal_delta)}
            for modifier in sorted(food.modifiers, key=lambda item: item.name)
        ],
        score=score,
    )


def _why(
    food: Food, portion: PortionSize, applied: list[ModifierConstant], ignored: list[str]
) -> str:
    modifier_text = ""
    if applied:
        modifier_text = " plus " + ", ".join(modifier.name for modifier in applied)
    ignored_text = ""
    if ignored:
        ignored_text = f"; ignored unsupported modifiers: {', '.join(ignored)}"
    return (
        f"Matched {food.name_en} and used its {portion.label} row"
        f"{modifier_text} from retrieved database facts{ignored_text}."
    )


def _float(value: object, fallback: Decimal) -> float:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return float(fallback)


def _float_or_none(value: object, fallback: Decimal | None) -> float | None:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return float(fallback) if fallback is not None else None
