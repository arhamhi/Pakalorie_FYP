import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import get_settings
from app.db.session import AsyncSessionLocal
from app.schemas.calorie import CalorieRequest
from app.services.calorie_engine import CalorieEngine

CASES = [
    ("Chicken Biryani", "Medium", [], 271),
    ("Nihari", "Standard Bowl", ["extra_tarri"], 315),
    ("Haleem", "Standard Cup", [], 300),
    ("Naan", None, [], 310),
]


async def main() -> None:
    engine = CalorieEngine(get_settings())
    async with AsyncSessionLocal() as session:
        await run_eval(session, engine)


async def run_eval(session: AsyncSession, engine: CalorieEngine) -> None:
    print("| dish | portion | modifiers | predicted kcal | reference kcal | delta |")
    print("|---|---|---|---:|---:|---:|")
    for dish, portion, modifiers, reference in CASES:
        result = await engine.calculate(
            session,
            CalorieRequest(recognized_dish=dish, portion=portion, modifiers=modifiers),
        )
        delta = result.calories_kcal - reference
        print(
            f"| {dish} | {portion or 'default'} | {', '.join(modifiers) or '-'} | "
            f"{result.calories_kcal:.0f} | {reference:.0f} | {delta:+.0f} |"
        )


if __name__ == "__main__":
    asyncio.run(main())
