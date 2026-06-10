# Calorie Engine Evaluation (predicted vs reference kcal)

Generated: 2026-06-10 against `https://api.srv987636.hstgr.cloud` (live API).

**What this measures:** grounding fidelity of the RAG calorie engine. The
reference kcal is computed from the seeded `desi_v1` database rows (selected
portion kcal + additive modifier constants). The engine retrieves those same
rows and lets Gemini compose the answer constrained to them — so any non-zero
delta is pipeline distortion (retrieval miss, portion mismatch, or the model
deviating from the retrieved facts), not a nutrition-science disagreement.
The nutritional accuracy of the seed values themselves is a data-curation
question, documented in `DATA_NOTES.md`.

| query | matched dish | portion used | modifiers | predicted kcal | reference kcal | delta | model |
|---|---|---|---|---:|---:|---:|---|
| Chicken Biryani | Chicken Biryani | Medium | — | 271 | 271 | +0 | gemini_grounded |
| Chicken Biryani | Chicken Biryani | Restaurant | restaurant | 625 | 625 | +0 | gemini_grounded |
| Nihari | Nihari (Beef/Mutton) | Standard Bowl | extra_tarri | 315 | 315 | +0 | gemini_grounded |
| Nihari | Nihari (Beef/Mutton) | Standard Bowl | nalli | 300 | 300 | +0 | gemini_grounded |
| Haleem | Haleem | Standard Cup | fried_onion, extra_oil | 385 | 385 | +0 | gemini_grounded |
| Chicken Karahi | Chicken Karahi | Bowl | homemade | 360 | 360 | +0 | gemini_grounded |
| Naan | Naan | Standard | roghni | 380 | 380 | +0 | gemini_grounded |
| Chapati | Chapati/Roti | Large | with_ghee | 182 | 182 | +0 | gemini_grounded |
| Doodh Patti Chai | Doodh Patti Chai | Cup | no_sugar | 95 | 95 | +0 | gemini_grounded |
| Halwa Puri | Halwa Puri (Complete) | Standard Plate | — | 530 | 530 | +0 | gemini_grounded |
| Seekh Kebab | Seekh Kebab (Beef) | 1 Skewer | — | 150 | 150 | +0 | gemini_grounded |
| Aloo Paratha | Aloo Paratha | Medium | restaurant | 400 | 400 | +0 | gemini_grounded |

**Summary:** 12/12 cases evaluated, 12/12 exact matches, MAE = 0.0 kcal, max |delta| = 0 kcal.

Reproduce: `node scripts/calorie-eval.mjs` (uses the live API; set
`API_BASE_URL` to point elsewhere).
