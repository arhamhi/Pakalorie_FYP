# Pakalorie Food Database — Data Notes

Honest framing of what is in the seeded food database and how each source should
be read. This is the reference for the SDS / report chapter.

## Two sources, one schema

Every row in `foods` carries a `source` tag, returned by both `GET /foods/{id}`
and `GET /foods/search`, so the app and the report can always tell them apart.

| `source`   | Count | What it is | Role |
|------------|-------|------------|------|
| `desi_v1`  | 30    | Curated Pakistani dishes with labeled portions (e.g. "Standard Bowl"), additive modifiers (e.g. `extra_tarri`), Roman + Urdu aliases. | **Product core.** The live demo runs on these. |
| `usda`     | 130   | Filtered extract of USDA FoodData Central **Foundation Foods** (raw-ingredient reference values, per 100 g). | **Reference breadth only.** Not dishes. |

Total seeded: **160** rows.

## Read this carefully

- **USDA rows are raw ingredients, not prepared dishes.** A USDA row describes,
  for example, the nutrition of an ingredient per 100 g — it is not a plated meal
  with a Pakistani serving size. They give the database breadth and a credible
  reference baseline, but they are not the recognition/calorie product surface.
- **The curated `desi_v1` dishes are the product.** They have realistic portions,
  modifiers, and bilingual aliases, which is what the recognition → portion →
  grounded-calorie pipeline is built around.
- **The live demo uses `desi_v1` dishes only.** USDA rows may appear in
  `/foods/search` results (and are tagged `source=usda` so they are
  distinguishable), but the demonstrated end-to-end flow stays on desi dishes.
- **`fiber_g` is intentionally nullable.** Many curated desi rows leave fiber
  `null` rather than guessing; USDA rows generally carry a fiber value. Tests and
  the API tolerate both.

## Possible later upgrade (not in this milestone)

Swapping the USDA **Foundation Foods** extract for FNDDS (Food and Nutrient
Database for Dietary Studies) *prepared* foods would give dish-level reference
rows instead of raw ingredients. Deferred — the curated desi core is sufficient
for P1 Final.
