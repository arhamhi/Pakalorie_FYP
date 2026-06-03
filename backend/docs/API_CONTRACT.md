# Pakalorie Backend API Contract

All non-health endpoints return the standard envelope:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

Errors return:

```json
{
  "success": false,
  "data": null,
  "error": "Human-readable error"
}
```

## Health

`GET /healthz`

Returns raw health JSON, not an envelope:

```json
{"status":"ok"}
```

## Recognition

`POST /recognize`

Multipart form-data:

- `image`: uploaded food image

Server-side Gemini only. The mobile app must not send or store a Gemini key.

Response data:

```json
{
  "food_label": "Chicken Biryani",
  "confidence": 0.86,
  "alternatives": [
    {"food_label": "Beef Biryani", "confidence": 0.42}
  ]
}
```

## Food Search

`GET /foods/search?q=karahi&limit=10`

Fuzzy search over `foods.name_en`, `foods.name_ur`, and `food_aliases.alias` using `pg_trgm`.

Response data:

```json
[
  {
    "id": "rice_01",
    "name_en": "Chicken Biryani",
    "name_ur": "چکن بریانی",
    "category": "Rice",
    "source": "desi_v1",
    "default_portion": {
      "id": 1,
      "label": "Small",
      "weight_g": 100,
      "is_default": true,
      "calories_kcal": 140,
      "protein_g": 7,
      "carbs_g": 19,
      "fat_g": 4,
      "fiber_g": null
    },
    "score": 0.71
  }
]
```

## Food Detail

`GET /foods/{id}`

Response data:

```json
{
  "id": "meat_01",
  "name_en": "Nihari (Beef/Mutton)",
  "name_ur": "نہاری",
  "category": "Meat Gravy",
  "source": "desi_v1",
  "base_unit": "grams",
  "aliases": ["Nihari (Beef/Mutton)", "nihari"],
  "portions": [
    {
      "id": 10,
      "label": "Standard Bowl",
      "weight_g": 300,
      "is_default": true,
      "calories_kcal": 255,
      "protein_g": 38,
      "carbs_g": 4,
      "fat_g": 17,
      "fiber_g": null
    }
  ],
  "modifiers": [
    {"id": 3, "name": "extra_tarri", "kcal_delta": 60, "description": null}
  ]
}
```

## Adjusted Nutrition

`POST /foods/{id}/nutrition`

Request body:

```json
{
  "portion": "Standard Bowl",
  "modifiers": ["extra_tarri"]
}
```

Rules:

- `portion` must be a portion label or id from that food.
- Each modifier must exist on that food.
- Final calories = selected portion kcal + additive modifier kcal constants.
- Protein/carbs/fat/fiber come from the selected portion row.
- Desi rows leave `fiber_g` as `null`.

Response data:

```json
{
  "food_id": "meat_01",
  "food_label": "Nihari (Beef/Mutton)",
  "portion": {
    "id": 10,
    "label": "Standard Bowl",
    "weight_g": 300,
    "is_default": true,
    "calories_kcal": 255,
    "protein_g": 38,
    "carbs_g": 4,
    "fat_g": 17,
    "fiber_g": null
  },
  "modifiers": [
    {"id": 3, "name": "extra_tarri", "kcal_delta": 60, "description": null}
  ],
  "calories_kcal": 315,
  "protein_g": 38,
  "carbs_g": 4,
  "fat_g": 17,
  "fiber_g": null,
  "formula": "255 kcal + extra_tarri (+60 kcal)"
}
```

## Grounded Calories

`POST /calories`

Request body:

```json
{
  "recognized_dish": "Nihari",
  "portion": "Standard Bowl",
  "modifiers": ["extra_tarri"],
  "top_k": 3
}
```

`portion` can also be a future MiDaS bucket: `small`, `medium`, or `large`. If the exact label is not found, the calorie engine picks a best available portion from retrieved rows.

Response data:

```json
{
  "food_id": "meat_01",
  "food_label": "Nihari (Beef/Mutton)",
  "portion_label": "Standard Bowl",
  "calories_kcal": 315,
  "protein_g": 38,
  "carbs_g": 4,
  "fat_g": 17,
  "fiber_g": null,
  "applied_modifiers": ["extra_tarri"],
  "ignored_modifiers": [],
  "why": "Matched Nihari (Beef/Mutton) and used its Standard Bowl row plus extra_tarri from retrieved database facts.",
  "model_used": "gemini_grounded",
  "source_rows": [
    {
      "food_id": "meat_01",
      "food_label": "Nihari (Beef/Mutton)",
      "source": "desi_v1",
      "portion_id": 10,
      "portion_label": "Standard Bowl",
      "weight_g": 300,
      "calories_kcal": 255,
      "protein_g": 38,
      "carbs_g": 4,
      "fat_g": 17,
      "fiber_g": null,
      "modifiers": [{"name": "extra_tarri", "kcal_delta": 60}],
      "score": 0.9
    }
  ]
}
```

When `GEMINI_API_KEY` is missing, `model_used` is `local_grounded_fallback` and the output is still based only on retrieved source rows.

## Data sources

Every food row is tagged with a `source` (`desi_v1` = curated Pakistani dishes, the
product core; `usda` = USDA Foundation Foods raw-ingredient references). See
[`DATA_NOTES.md`](./DATA_NOTES.md) for how to read each source and why the live
demo uses desi dishes only.
