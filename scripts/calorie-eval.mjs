// Calorie engine eval against the LIVE API (Phase 2 success criterion 4).
//
// For a known-dish set, compares POST /calories output against the reference
// kcal derived from the seeded DB rows (portion kcal + additive modifier
// constants). This measures GROUNDING FIDELITY: the RAG pipeline (retrieval +
// Gemini composition) must reproduce the retrieved facts without distortion.
// It does not measure the nutritional truth of the seed data itself.
//
// Run:  node scripts/calorie-eval.mjs
// Writes backend/docs/CALORIE_EVAL.md and prints the same table.

import { writeFileSync } from "node:fs";

const BASE = process.env.API_BASE_URL ?? "https://api.srv987636.hstgr.cloud";
const OUT = new URL("../backend/docs/CALORIE_EVAL.md", import.meta.url);

// [query, portion, modifiers, reference kcal from the desi_v1 seed]
const CASES = [
  ["Chicken Biryani", "Medium", [], 271],
  ["Chicken Biryani", "Restaurant", ["restaurant"], 625],
  ["Nihari", "Standard Bowl", ["extra_tarri"], 315],
  ["Nihari", null, ["nalli"], 300],
  ["Haleem", "Standard Cup", ["fried_onion", "extra_oil"], 385],
  ["Chicken Karahi", "Bowl", ["homemade"], 360],
  ["Naan", null, ["roghni"], 380],
  ["Chapati", "Large", ["with_ghee"], 182],
  ["Doodh Patti Chai", "Cup", ["no_sugar"], 95],
  ["Halwa Puri", null, [], 530],
  ["Seekh Kebab", null, [], 150],
  ["Aloo Paratha", "Medium", ["restaurant"], 400],
];

async function callCalories(recognized_dish, portion, modifiers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${BASE}/calories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recognized_dish,
        ...(portion ? { portion } : {}),
        modifiers,
      }),
      signal: controller.signal,
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error ?? `HTTP ${response.status}`);
    }
    return body.data;
  } finally {
    clearTimeout(timer);
  }
}

const rows = [];
const deltas = [];
let failures = 0;

for (const [query, portion, modifiers, reference] of CASES) {
  try {
    const data = await callCalories(query, portion, modifiers);
    const delta = data.calories_kcal - reference;
    deltas.push(Math.abs(delta));
    rows.push(
      `| ${query} | ${data.food_label} | ${data.portion_label} | ` +
        `${modifiers.join(", ") || "—"} | ${data.calories_kcal.toFixed(0)} | ` +
        `${reference} | ${delta >= 0 ? "+" : ""}${delta.toFixed(0)} | ${data.model_used} |`,
    );
    console.log(
      `${query}: predicted=${data.calories_kcal} reference=${reference} ` +
        `delta=${delta.toFixed(0)} (${data.model_used})`,
    );
  } catch (error) {
    failures += 1;
    rows.push(`| ${query} | ERROR | — | ${modifiers.join(", ") || "—"} | — | ${reference} | — | — |`);
    console.error(`${query}: FAILED — ${error.message}`);
  }
  // Be polite to the server-side Gemini quota.
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

const evaluated = deltas.length;
const exact = deltas.filter((d) => d === 0).length;
const mae = evaluated ? deltas.reduce((a, b) => a + b, 0) / evaluated : NaN;
const maxAbs = evaluated ? Math.max(...deltas) : NaN;

const report = `# Calorie Engine Evaluation (predicted vs reference kcal)

Generated: ${new Date().toISOString().slice(0, 10)} against \`${BASE}\` (live API).

**What this measures:** grounding fidelity of the RAG calorie engine. The
reference kcal is computed from the seeded \`desi_v1\` database rows (selected
portion kcal + additive modifier constants). The engine retrieves those same
rows and lets Gemini compose the answer constrained to them — so any non-zero
delta is pipeline distortion (retrieval miss, portion mismatch, or the model
deviating from the retrieved facts), not a nutrition-science disagreement.
The nutritional accuracy of the seed values themselves is a data-curation
question, documented in \`DATA_NOTES.md\`.

| query | matched dish | portion used | modifiers | predicted kcal | reference kcal | delta | model |
|---|---|---|---|---:|---:|---:|---|
${rows.join("\n")}

**Summary:** ${evaluated}/${CASES.length} cases evaluated${failures ? ` (${failures} failed)` : ""}, ${exact}/${evaluated} exact matches, MAE = ${mae.toFixed(1)} kcal, max |delta| = ${maxAbs.toFixed(0)} kcal.

Reproduce: \`node scripts/calorie-eval.mjs\` (uses the live API; set
\`API_BASE_URL\` to point elsewhere).
`;

writeFileSync(OUT, report);
console.log(`\nSummary: ${exact}/${evaluated} exact, MAE=${mae.toFixed(1)}, max=${maxAbs.toFixed(0)}`);
console.log(`Report written to backend/docs/CALORIE_EVAL.md`);
if (failures > 0) process.exitCode = 1;
