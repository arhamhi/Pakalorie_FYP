import argparse
import csv
import json
from pathlib import Path

SOURCE_URL = (
    "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_csv_2026-04-30.zip"
)
REQUIRED_NUTRIENTS = {
    "protein_g": ["1003"],
    "fat_g": ["1004"],
    "carbs_g": ["1005"],
    "calories_kcal": ["1008", "2047", "2048"],
}
OPTIONAL_NUTRIENTS = {"fiber_g": ["1079"]}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a small USDA Foundation Foods extract for Pakalorie seeding."
    )
    parser.add_argument("--source-dir", required=True, help="Extracted FDC CSV folder.")
    parser.add_argument("--output", default="data/usda_foundation_sample.json")
    parser.add_argument("--limit", type=int, default=130)
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    output_path = Path(args.output)
    foods = _read_csv(source_dir / "food.csv")
    food_categories = {
        row["id"]: row.get("description") or row.get("code") or row["id"]
        for row in _read_csv(source_dir / "food_category.csv")
    }
    nutrients_by_fdc = _nutrients_by_fdc(source_dir / "food_nutrient.csv")

    rows = []
    for food in foods:
        if food["data_type"] != "foundation_food":
            continue
        nutrients = nutrients_by_fdc.get(food["fdc_id"], {})
        values = _pick_required_values(nutrients)
        if values is None:
            continue

        fdc_id = food["fdc_id"]
        description = food["description"].strip()
        category = food_categories.get(food.get("food_category_id", ""), "USDA Foundation Food")
        rows.append(
            {
                "id": f"usda_{fdc_id}",
                "fdc_id": int(fdc_id),
                "name_en": description,
                "category": category,
                "base_unit": "grams",
                "publication_date": food.get("publication_date"),
                "portions": [
                    {
                        "label": "100 g",
                        "weight": 100,
                        "kcal": values["calories_kcal"],
                        "p": values["protein_g"],
                        "c": values["carbs_g"],
                        "f": values["fat_g"],
                        "fiber": values.get("fiber_g"),
                    }
                ],
                "modifiers": {},
                "aliases": _aliases(description),
            }
        )
        if len(rows) >= args.limit:
            break

    output = {
        "version": "fdc-foundation-2026-04-filtered-v1",
        "source": "usda",
        "source_name": "USDA FoodData Central Foundation Foods",
        "source_release": "04/2026",
        "source_url": SOURCE_URL,
        "foods": rows,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"Wrote {len(rows)} USDA rows to {output_path}")


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def _nutrients_by_fdc(path: Path) -> dict[str, dict[str, float]]:
    nutrients: dict[str, dict[str, float]] = {}
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            amount = row.get("amount")
            if not amount:
                continue
            try:
                value = float(amount)
            except ValueError:
                continue
            nutrients.setdefault(row["fdc_id"], {})[row["nutrient_id"]] = value
    return nutrients


def _pick_required_values(nutrients: dict[str, float]) -> dict[str, float] | None:
    values: dict[str, float] = {}
    for field, nutrient_ids in REQUIRED_NUTRIENTS.items():
        value = _first_value(nutrients, nutrient_ids)
        if value is None:
            return None
        values[field] = value
    for field, nutrient_ids in OPTIONAL_NUTRIENTS.items():
        value = _first_value(nutrients, nutrient_ids)
        if value is not None:
            values[field] = value
    return values


def _first_value(nutrients: dict[str, float], nutrient_ids: list[str]) -> float | None:
    for nutrient_id in nutrient_ids:
        if nutrient_id in nutrients:
            return nutrients[nutrient_id]
    return None


def _aliases(description: str) -> list[str]:
    primary = description.split(",", maxsplit=1)[0].strip()
    aliases = {description, primary}
    if primary.lower().startswith("milk"):
        aliases.add("milk")
    return sorted(alias for alias in aliases if alias)


if __name__ == "__main__":
    main()
