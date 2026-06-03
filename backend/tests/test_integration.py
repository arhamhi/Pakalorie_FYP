"""Live-database integration tests.

These exercise the real stack (FastAPI -> async SQLAlchemy -> asyncpg -> Postgres)
against a seeded database. They are skipped automatically unless a live database
is reachable at the configured DATABASE_URL, so the fast unit run still works with
no database. To run them, point DATABASE_URL at a seeded Postgres (e.g. open the
VPS SSH tunnel) and run `uv run pytest -m integration`.

Each test uses a fresh NullPool engine bound to its own event loop to avoid the
async-pool "attached to a different loop" pitfall.
"""

import socket

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.settings import Settings, get_settings
from app.db.session import get_session
from app.main import app
from app.schemas.calorie import CalorieRequest
from app.services.calorie_engine import CalorieEngine

pytestmark = pytest.mark.integration

_DB_URL = get_settings().database_url


def _db_reachable() -> bool:
    url = make_url(_DB_URL)
    try:
        with socket.create_connection((url.host or "localhost", url.port or 5432), timeout=2):
            return True
    except OSError:
        return False


if not _db_reachable():
    pytest.skip(
        "No live database reachable at DATABASE_URL; open the tunnel to run integration tests",
        allow_module_level=True,
    )


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(_DB_URL, poolclass=NullPool)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def client(engine):
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


async def test_seed_counts_and_provenance(engine):
    async with engine.connect() as c:
        total = await c.scalar(text("select count(*) from foods"))
        desi = await c.scalar(text("select count(*) from foods where source='desi_v1'"))
        usda = await c.scalar(text("select count(*) from foods where source='usda'"))
    assert (total, desi, usda) == (160, 30, 130)


async def test_search_returns_expected_desi_dish(client):
    for query, expected_id in [("nihari", "meat_01"), ("biryani", "rice_01")]:
        resp = await client.get("/foods/search", params={"q": query})
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        ids = [row["id"] for row in body["data"]]
        assert expected_id in ids, f"{expected_id} not in results for '{query}': {ids}"
        # the expected desi dish should rank first (highest trigram score)
        assert body["data"][0]["id"] == expected_id
        assert body["data"][0]["source"] == "desi_v1"


async def test_food_detail_shape_and_null_fiber_on_desi(client):
    resp = await client.get("/foods/meat_01")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert set(data) >= {
        "id",
        "name_en",
        "name_ur",
        "category",
        "source",
        "base_unit",
        "aliases",
        "portions",
        "modifiers",
    }
    assert data["source"] == "desi_v1"
    assert data["base_unit"] == "grams"
    # Nihari is a desi row that intentionally leaves fiber null.
    assert any(p["fiber_g"] is None for p in data["portions"])


async def test_usda_row_carries_fiber(client, engine):
    # Data-driven: find a USDA food whose portion has a fiber value, then assert
    # the API surfaces it. Proves source=usda rows differ from null-fiber desi rows.
    async with engine.connect() as c:
        usda_id = await c.scalar(
            text(
                "select f.id from foods f "
                "join portion_sizes p on p.food_id = f.id "
                "join nutrition_facts n on n.portion_id = p.id "
                "where f.source = 'usda' and n.fiber_g is not null limit 1"
            )
        )
    assert usda_id is not None, "expected at least one USDA row with fiber"
    resp = await client.get(f"/foods/{usda_id}")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["source"] == "usda"
    assert any(p["fiber_g"] is not None for p in data["portions"])


async def test_nutrition_additive_modifier_math(client):
    resp = await client.post(
        "/foods/meat_01/nutrition",
        json={"portion": "Standard Bowl", "modifiers": ["extra_tarri"]},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    # 255 kcal base + 60 kcal extra_tarri = 315; desi fiber stays null.
    assert data["calories_kcal"] == 315
    assert data["fiber_g"] is None
    assert "extra_tarri" in data["formula"]


@pytest.mark.parametrize(
    "payload",
    [
        {"portion": "Standard Bowl", "modifiers": ["with_naan"]},  # foreign modifier
        {"portion": "Giant Vat", "modifiers": []},  # foreign portion
    ],
)
async def test_nutrition_rejects_foreign_portion_or_modifier(client, payload):
    resp = await client.post("/foods/meat_01/nutrition", json=payload)
    assert resp.status_code == 422


async def test_calories_local_grounded_fallback(engine):
    # Deterministic, no Gemini key needed: drive the engine directly against the
    # live DB with an empty key so it must use the grounded fallback path.
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    calorie_engine = CalorieEngine(Settings(GEMINI_API_KEY=""))
    async with session_factory() as session:
        result = await calorie_engine.calculate(
            session,
            CalorieRequest(
                recognized_dish="Nihari",
                portion="Standard Bowl",
                modifiers=["extra_tarri"],
            ),
        )
    assert result.model_used == "local_grounded_fallback"
    assert result.calories_kcal == 315
    assert result.food_label == "Nihari (Beef/Mutton)"
    assert result.applied_modifiers == ["extra_tarri"]
    assert result.source_rows and result.source_rows[0].source == "desi_v1"
