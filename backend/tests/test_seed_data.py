import json
from pathlib import Path

from scripts.seed_foods import normalize_desi, normalize_usda

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def test_seed_files_hit_required_food_counts() -> None:
    desi = json.loads((DATA_DIR / "desi_seed.json").read_text(encoding="utf-8"))["dishes"]
    usda = json.loads((DATA_DIR / "usda_foundation_sample.json").read_text(encoding="utf-8"))[
        "foods"
    ]

    assert len(desi) == 30
    assert len(usda) == 130
    assert len(desi) + len(usda) >= 150


def test_desi_seed_preserves_labeled_portions_modifiers_and_nullable_fiber() -> None:
    desi = json.loads((DATA_DIR / "desi_seed.json").read_text(encoding="utf-8"))["dishes"]
    nihari = next(item for item in desi if item["id"] == "meat_01")

    normalized = normalize_desi(nihari)

    assert normalized["source"] == "desi_v1"
    assert normalized["name_ur"]
    assert normalized["portions"][0]["label"] == "Standard Bowl"
    assert "extra_tarri" in normalized["modifiers"]
    assert "fiber" not in normalized["portions"][0]
    assert ("nihari", "en") in {
        (alias.lower(), language) for alias, language in normalized["aliases"]
    }


def test_usda_seed_uses_real_fdc_ids_and_fiber_when_available() -> None:
    usda = json.loads((DATA_DIR / "usda_foundation_sample.json").read_text(encoding="utf-8"))[
        "foods"
    ]
    hummus = next(item for item in usda if item["fdc_id"] == 321358)

    normalized = normalize_usda(hummus)

    assert normalized["source"] == "usda"
    assert normalized["source_id"] == "321358"
    assert normalized["portions"][0]["label"] == "100 g"
    assert normalized["portions"][0]["fiber"] == 5.4
