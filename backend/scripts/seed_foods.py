import asyncio
import json
import re
import unicodedata
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import delete, func, select

from app.db.models import Food, FoodAlias, ModifierConstant, NutritionFact, PortionSize
from app.db.session import AsyncSessionLocal

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DESI_SEED_PATH = DATA_DIR / "desi_seed.json"
USDA_SEED_PATH = DATA_DIR / "usda_foundation_sample.json"

ROMAN_ALIASES = {
    "rice_01": ["biryani", "chicken biryani", "biryani plate"],
    "meat_01": ["nihari", "beef nihari", "mutton nihari"],
    "meat_02": ["haleem", "halim"],
    "bread_01": ["roti", "chapati", "chappati"],
    "bread_02": ["naan", "nan"],
    "lentil_01": ["daal", "dal", "dhal"],
    "snack_01": ["samosa", "samosay"],
    "drink_01": ["chai", "doodh patti", "tea"],
}


async def main() -> None:
    desi_data = json.loads(DESI_SEED_PATH.read_text(encoding="utf-8"))
    usda_data = json.loads(USDA_SEED_PATH.read_text(encoding="utf-8"))

    async with AsyncSessionLocal() as session:
        async with session.begin():
            for dish in desi_data["dishes"]:
                await upsert_food(session, normalize_desi(dish))
            for item in usda_data["foods"]:
                await upsert_food(session, normalize_usda(item))

        total = await session.scalar(select(func.count()).select_from(Food))
        desi_total = await session.scalar(
            select(func.count()).select_from(Food).where(Food.source == "desi_v1")
        )
        usda_total = await session.scalar(
            select(func.count()).select_from(Food).where(Food.source == "usda")
        )

    print(f"Seed complete: foods={total}, desi_v1={desi_total}, usda={usda_total}")


async def upsert_food(session, item: dict[str, Any]) -> None:
    food = await session.get(Food, item["id"])
    if food is None:
        food = Food(id=item["id"])
        session.add(food)

    food.source = item["source"]
    food.source_id = item["source_id"]
    food.name_en = item["name_en"]
    food.name_ur = item.get("name_ur")
    food.slug = item["slug"]
    food.category = item.get("category")
    food.base_unit = item.get("base_unit") or "grams"
    food.description = item.get("description")
    await session.flush()

    await session.execute(delete(NutritionFact).where(NutritionFact.food_id == food.id))
    await session.execute(delete(PortionSize).where(PortionSize.food_id == food.id))
    await session.execute(delete(ModifierConstant).where(ModifierConstant.food_id == food.id))
    await session.execute(delete(FoodAlias).where(FoodAlias.food_id == food.id))
    await session.flush()

    for alias, language in item["aliases"]:
        session.add(FoodAlias(food_id=food.id, alias=alias[:255], language=language))

    for modifier_name, kcal_delta in item["modifiers"].items():
        session.add(
            ModifierConstant(
                food_id=food.id,
                name=modifier_name,
                kcal_delta=Decimal(str(kcal_delta)),
            )
        )

    for index, portion_data in enumerate(item["portions"]):
        portion = PortionSize(
            food_id=food.id,
            label=portion_data["label"],
            weight_g=_decimal_or_none(portion_data.get("weight")),
            source_portion_id=portion_data.get("source_portion_id"),
            is_default=index == 0,
        )
        session.add(portion)
        await session.flush()
        session.add(
            NutritionFact(
                food_id=food.id,
                portion_id=portion.id,
                calories_kcal=Decimal(str(portion_data["kcal"])),
                protein_g=Decimal(str(portion_data["p"])),
                carbs_g=Decimal(str(portion_data["c"])),
                fat_g=Decimal(str(portion_data["f"])),
                fiber_g=_decimal_or_none(portion_data.get("fiber")),
                portion_weight_g=_decimal_or_none(portion_data.get("weight")),
            )
        )


def normalize_desi(dish: dict[str, Any]) -> dict[str, Any]:
    food_id = dish["id"]
    aliases = _alias_pairs(
        [
            dish["name_en"],
            dish.get("name_ur"),
            dish.get("category"),
            *_name_fragments(dish["name_en"]),
            *ROMAN_ALIASES.get(food_id, []),
        ]
    )
    return {
        "id": food_id,
        "source": "desi_v1",
        "source_id": food_id,
        "name_en": dish["name_en"],
        "name_ur": dish.get("name_ur"),
        "slug": slugify(dish["name_en"], prefix=food_id),
        "category": dish.get("category"),
        "base_unit": dish.get("base_unit") or "grams",
        "description": "Curated Pakalorie desi core item.",
        "portions": dish["portions"],
        "modifiers": dish.get("modifiers") or {},
        "aliases": aliases,
    }


def normalize_usda(item: dict[str, Any]) -> dict[str, Any]:
    fdc_id = str(item["fdc_id"])
    aliases = _alias_pairs([item["name_en"], item.get("category"), *(item.get("aliases") or [])])
    return {
        "id": f"usda_{fdc_id}",
        "source": "usda",
        "source_id": fdc_id,
        "name_en": item["name_en"],
        "name_ur": None,
        "slug": slugify(item["name_en"], prefix=f"usda-{fdc_id}"),
        "category": item.get("category") or "USDA Foundation Food",
        "base_unit": item.get("base_unit") or "grams",
        "description": "USDA FoodData Central Foundation Foods filtered extract.",
        "portions": item["portions"],
        "modifiers": item.get("modifiers") or {},
        "aliases": aliases,
    }


def _alias_pairs(values: list[str | None]) -> list[tuple[str, str]]:
    seen: set[tuple[str, str]] = set()
    pairs: list[tuple[str, str]] = []
    for value in values:
        if not value:
            continue
        alias = " ".join(str(value).split())
        if not alias:
            continue
        language = "ur" if _contains_non_ascii(alias) else "en"
        key = (alias.lower(), language)
        if key not in seen:
            seen.add(key)
            pairs.append((alias, language))
    return pairs


def _name_fragments(name: str) -> list[str]:
    cleaned = re.sub(r"\([^)]*\)", "", name)
    parts = re.split(r"[/,-]", cleaned)
    return [part.strip() for part in parts if part.strip()]


def _contains_non_ascii(value: str) -> bool:
    return any(ord(char) > 127 for char in value)


def _decimal_or_none(value: Any) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))


def slugify(value: str, *, prefix: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", normalized.lower()).strip("-")
    return f"{prefix}-{slug}" if slug else prefix


if __name__ == "__main__":
    asyncio.run(main())
