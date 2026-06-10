// Live contract smoke test for the Pakalorie backend client (src/lib/api.ts).
//
// Verifies the response shapes the mobile API client maps against the live
// deploy. Does NOT cover POST /recognize (needs a multipart image upload + a
// device); that path is verified on-device per the handoff.
//
// Run:  node scripts/api-smoke.mjs
// Override base URL:  API_BASE_URL=https://host node scripts/api-smoke.mjs
//
// Requires Node 18+ (global fetch). Exits non-zero if any check fails.

const BASE_URL = (process.env.API_BASE_URL || 'https://api.srv987636.hstgr.cloud').replace(
  /\/+$/,
  '',
);

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function getJson(path, init) {
  const res = await fetch(`${BASE_URL}${path}`, init);
  const body = await res.json();
  return { res, body };
}

async function main() {
  console.log(`Smoke testing ${BASE_URL}\n`);

  // 1. Health
  {
    const { res, body } = await getJson('/healthz');
    check('GET /healthz returns 200 + status ok', res.ok && body.status === 'ok', JSON.stringify(body));
  }

  // 2. Food search envelope + shape
  {
    const { body } = await getJson('/foods/search?q=nihari&limit=3');
    const row = Array.isArray(body.data) ? body.data[0] : null;
    check('GET /foods/search envelope success', body.success === true && Array.isArray(body.data));
    check(
      'search row has id/name_en/source/score/default_portion',
      !!row && row.id && row.name_en && row.source && typeof row.score === 'number' && 'default_portion' in row,
      JSON.stringify(row),
    );
  }

  // 3. Food detail
  {
    const { body } = await getJson('/foods/meat_01');
    const d = body.data;
    check('GET /foods/meat_01 envelope success', body.success === true && !!d);
    check(
      'detail has aliases/portions/modifiers + nullable fiber',
      !!d && Array.isArray(d.aliases) && Array.isArray(d.portions) && Array.isArray(d.modifiers) && d.portions[0].fiber_g === null,
      JSON.stringify(d?.portions?.[0]),
    );
  }

  // 4. Adjusted nutrition (additive modifier math)
  {
    const { body } = await getJson('/foods/meat_01/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portion: 'Standard Bowl', modifiers: ['extra_tarri'] }),
    });
    const d = body.data;
    check('POST /foods/{id}/nutrition envelope success', body.success === true && !!d);
    check(
      'nutrition applies additive modifier (255 + 60 = 315)',
      !!d && d.calories_kcal === 315 && d.fiber_g === null,
      JSON.stringify({ kcal: d?.calories_kcal, fiber: d?.fiber_g }),
    );
  }

  // 5. Grounded calories (RAG path)
  {
    const { body } = await getJson('/calories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recognized_dish: 'Nihari', top_k: 3 }),
    });
    const d = body.data;
    check('POST /calories envelope success', body.success === true && !!d);
    check(
      'calories has food_label/kcal/why/model_used/source_rows',
      !!d && d.food_label && typeof d.calories_kcal === 'number' && d.why && d.model_used && Array.isArray(d.source_rows),
      JSON.stringify({ label: d?.food_label, model: d?.model_used, rows: d?.source_rows?.length }),
    );
    check('calories tolerates null fiber on desi rows', !!d && d.fiber_g === null, JSON.stringify({ fiber: d?.fiber_g }));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
