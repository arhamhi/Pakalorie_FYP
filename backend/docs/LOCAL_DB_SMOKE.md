# Local DB Smoke Checklist

Use this after Docker Desktop is healthy. The previous local attempt pulled `pgvector/pgvector:pg16`, then Docker Desktop failed container creation with API `502 Bad Gateway`; a retry hit Docker CLI `pageAlloc: out of memory`.

## Commands

```powershell
cd C:\Users\Arham\OneDrive\Desktop\Uni\FYP\pakalorie-fyp\backend
docker compose up db -d
uv --cache-dir .uv-cache run alembic upgrade head
uv --cache-dir .uv-cache run python -m scripts.seed_foods
uv --cache-dir .uv-cache run python -m scripts.eval_calories
uv --cache-dir .uv-cache run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:8000/healthz' -UseBasicParsing
Invoke-WebRequest -Uri 'http://127.0.0.1:8000/foods/search?q=nihari' -UseBasicParsing
```

## Expected DB Counts

After `python -m scripts.seed_foods`, expected console output:

```text
Seed complete: foods=160, desi_v1=30, usda=130
```

Manual SQL checks:

```sql
select count(*) from foods;
select count(*) from foods where source = 'desi_v1';
select count(*) from foods where source = 'usda';
select name_en, name_ur from foods where id = 'meat_01';
select label, kcal_delta from modifier_constants where food_id = 'meat_01';
```

Expected:

- `foods >= 150`
- `desi_v1 = 30`
- `usda = 130`
- `name_ur` preserved for desi rows
- desi modifiers preserved as additive kcal constants

## Smoke Requests

Food detail:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:8000/foods/meat_01' -UseBasicParsing
```

Adjusted nutrition:

```powershell
Invoke-WebRequest `
  -Uri 'http://127.0.0.1:8000/foods/meat_01/nutrition' `
  -Method POST `
  -ContentType 'application/json' `
  -Body '{"portion":"Standard Bowl","modifiers":["extra_tarri"]}' `
  -UseBasicParsing
```

Grounded calories:

```powershell
Invoke-WebRequest `
  -Uri 'http://127.0.0.1:8000/calories' `
  -Method POST `
  -ContentType 'application/json' `
  -Body '{"recognized_dish":"Nihari","portion":"Standard Bowl","modifiers":["extra_tarri"]}' `
  -UseBasicParsing
```

Recognition:

`POST /recognize` needs `GEMINI_API_KEY` and a multipart image field named `image`. Do not test it with a client-side key.
