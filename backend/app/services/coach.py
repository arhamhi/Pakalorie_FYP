"""Server-side Claude calls that used to run on the phone with Gemini:
the Ustad chat, the Home advice line, Create Custom Meal estimates, and the
one-shot nutrition estimate the scan screen falls back to. The prompts are the
old client prompts (src/lib/gemini.ts), kept close to the original wording."""

import re
from typing import Any

from app.core.settings import Settings
from app.schemas.ai import (
    AdviceRequest,
    ChatRequest,
    CoachContext,
    MealEstimateRequest,
    NutritionAlternative,
    NutritionEstimate,
)
from app.services.claude import ClaudeClient

FOOD_REFERENCE = """PAKISTANI FOOD REFERENCE (typical servings):
- Chicken Biryani (1 plate ~300g): 450-550 kcal, P:25g, C:55g, F:15g
- Beef Biryani: 550-650 kcal, P:28g, C:55g, F:22g
- Plain Paratha: 250-300 kcal, P:6g, C:35g, F:12g
- Aloo Paratha: 300-350 kcal, P:7g, C:42g, F:14g
- Chicken Karahi (1 serving): 400-500 kcal, P:35g, C:8g, F:28g
- Nihari (1 bowl): 500-600 kcal, P:28g, C:15g, F:40g
- Haleem (1 bowl): 450-550 kcal, P:22g, C:45g, F:22g
- Chapati/Roti: 100-120 kcal, P:4g, C:22g, F:1g
- Naan: 280-320 kcal, P:8g, C:50g, F:6g
- Daal (1 bowl): 180-220 kcal, P:12g, C:28g, F:4g
- Chicken Tikka (6 pcs): 300-350 kcal, P:40g, C:5g, F:15g
- Seekh Kabab (2 pcs): 250-300 kcal, P:20g, C:8g, F:16g
- Samosa (1 pc): 200-250 kcal, P:5g, C:25g, F:12g
- Pakora (5 pcs): 250-300 kcal, P:6g, C:28g, F:14g
- Chai with milk (1 cup): 70-90 kcal, P:3g, C:10g, F:3g
- Lassi sweet (1 glass): 180-220 kcal, P:6g, C:28g, F:5g"""

USTAD_SYSTEM_PROMPT = """You are Ustad, Pakalorie's nutrition coach for Pakistani users, inside a calorie-tracking app.

Who you are: a nutritionist who knows desi food (biryani, daal, paratha, mithai) and talks like a trusted gym bhai texting a client. Friendly and direct, never corporate. Use "aap" for respect, and words like "scene", "chaska", "fit" for relatability.

Language: mix English and Roman Urdu naturally, about 70% English and 30% Roman Urdu. Use "karo/karein" for suggestions. Examples: "Zyada protein chahiye aaj", "Oil kam use karo", "Scene set hai".

Length and shape: text like a friend on WhatsApp. Every message is SHORT: one sentence, at most about 20 words. A simple question gets one message. If there is more to say, send two or three messages, with a line containing only --- between them. Never more than three, never a paragraph. Lead with the answer (the food and the number). Drop filler and the user's name unless it adds something. Write plain text: no asterisks, bold, headings, bullets or other markdown. No sign-offs.

Example, for "biryani kitni calories hoti hai?":
Ek plate chicken biryani (300g) is about 500 kcal.
---
Aaj 1700 bache hain, so it fits. Raita ke saath lo, extra gravy skip karo.

How to help:
- Give real portions ("200g chawal", not "ek bowl").
- Suggest desi swaps with the saving ("Paratha ki jagah roti, about 150 kcal kam").
- Point out hidden calories (oil, ghee, tarka, frying).
- Celebrate wins ("Mashallah, target hit kiya") and correct gently ("Thora zyada ho gaya, dinner light rakhna").
- Know meal patterns: chai and paratha breakfast, heavy rice or salan lunch, lighter roti dinner. Adapt for Ramadan (sehri, iftar) when it comes up.
- Use the user's numbers below when they matter.

You give general nutrition guidance, not medical advice. If someone mentions a medical condition, pregnancy, an eating disorder, or very low intake, keep it general and suggest they check with a doctor or dietitian.

""" + FOOD_REFERENCE

IDENTIFY_PROMPT = """You are an expert Pakistani and South Asian food nutritionist.

Look at this food photo and estimate its nutrition.
1. Name the exact dish where you can ("Chicken Biryani", not just "Biryani").
2. If several items are visible, describe the main dish and list the others as alternatives.
3. Use typical Pakistani home or restaurant serving sizes, and account for ghee, oil and tarka.
4. Confidence is a number from 0 to 1.

""" + FOOD_REFERENCE + """

Return exactly this JSON:
{
  "name": "Dish name in English",
  "nameUrdu": "Dish name in Roman Urdu",
  "calories": 450,
  "protein": 25,
  "carbs": 55,
  "fat": 15,
  "fiber": 3,
  "servingSize": "1 plate (300g)",
  "confidence": 0.85,
  "alternatives": [{"name": "Other likely dish", "calories": 400}],
  "notes": "Short note about the estimate"
}

If the photo is not food, return {"name": "Unknown", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "servingSize": "N/A", "confidence": 0, "alternatives": [], "notes": "Not food"}."""

MEAL_PROMPT = """You are an expert Pakistani and South Asian food nutritionist. Estimate the nutrition for one serving of this meal.

Meal name: {name}
Description: {description}

Use typical Pakistani cooking (ghee, oil, masala, tarka) and realistic home or restaurant portions. Apply any modifiers in the description (extra oily, small portion, no rice, and so on).

""" + FOOD_REFERENCE + """

Return exactly this JSON:
{{"name": "{name}", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "servingSize": "1 plate"}}
with your numbers in place of the zeros (protein, carbs and fat in grams)."""

ADVICE_PROMPT = """Write one short motivational line for a Pakistani user of a calorie-tracking app.

Their status right now:
- Calories left today: {remaining} kcal
- Time of day: {time_of_day}
- Goal: {goal}
- Water: {water}/8 glasses

Rules: at most 15 words, about 70% English and 30% Roman Urdu, realistic, refer to their status, no greeting. Reply with the line only.

Examples of the tone:
Protein pe focus karo aaj, target almost done!
Pani kam hai yaar, 2 aur glasses pi lo
Dinner mein light rakhna, on track ho"""

FALLBACK_ADVICE = "Lage raho, consistency is key!"


class CoachService:
    def __init__(self, settings: Settings) -> None:
        self.claude = ClaudeClient(settings)

    async def chat(self, request: ChatRequest) -> list[str]:
        system = USTAD_SYSTEM_PROMPT + "\n\n" + _context_block(request.context)
        messages = _clean_history(request.history[-20:])
        if messages and messages[-1]["role"] == "user":
            # Keep strict user/assistant alternation before the new message.
            messages[-1]["content"] += "\n\n" + request.message
        else:
            messages.append({"role": "user", "content": request.message})
        text = await self.claude.generate_text(system, messages, max_output_tokens=400)
        return split_bubbles(text)

    async def advice(self, request: AdviceRequest) -> str:
        prompt = ADVICE_PROMPT.format(
            remaining=round(request.remaining_calories),
            time_of_day=request.time_of_day,
            goal=request.goal,
            water=request.water_count,
        )
        text = await self.claude.generate_text(
            "You write one-line nudges for a calorie-tracking app.",
            [{"role": "user", "content": prompt}],
            max_output_tokens=100,
        )
        return text.strip().strip('"').splitlines()[0].strip() or FALLBACK_ADVICE

    async def estimate_meal(self, request: MealEstimateRequest) -> NutritionEstimate:
        prompt = MEAL_PROMPT.format(
            name=request.name.replace('"', "'"),
            description=request.description or "Standard Pakistani/South Asian preparation",
        )
        result = await self.claude.generate_json(prompt, max_output_tokens=400)
        estimate = _to_estimate(result, default_name=request.name)
        estimate.confidence = 0.7
        return estimate

    async def identify(self, image_bytes: bytes, mime_type: str | None) -> NutritionEstimate:
        result = await self.claude.generate_json(
            IDENTIFY_PROMPT,
            image_bytes=image_bytes,
            mime_type=mime_type or "image/jpeg",
            max_output_tokens=800,
        )
        return _to_estimate(result, default_name="Unknown")


def split_bubbles(text: str) -> list[str]:
    """Split a reply on --- lines into chat bubbles (max 3, extras merged)."""
    parts = [p.strip() for p in re.split(r"\n\s*-{3,}\s*\n", "\n" + text + "\n")]
    parts = [p for p in parts if p]
    if len(parts) > 3:
        parts = parts[:2] + ["\n".join(parts[2:])]
    return parts or [text.strip()]


def _context_block(ctx: CoachContext) -> str:
    def num(value: float | None, unit: str = "") -> str:
        return "unknown" if value is None else f"{round(value)}{unit}"

    return (
        "USER CONTEXT (from the app, today):\n"
        f"- Name: {ctx.user_name or 'User'}\n"
        f"- Calories left today: {num(ctx.remaining_calories, ' kcal')}\n"
        f"- Eaten so far: protein {num(ctx.protein, 'g')}, carbs {num(ctx.carbs, 'g')}, fat {num(ctx.fat, 'g')}\n"
        f"- Goal: {ctx.goal or 'maintain'}\n"
        f"- Water: {ctx.water_count if ctx.water_count is not None else 0}/8 glasses\n"
        f"- Local time: {ctx.local_time or 'unknown'}"
    )


def _clean_history(turns: list[Any]) -> list[dict[str, str]]:
    """Merge same-role neighbours and drop a leading assistant turn, so the
    list alternates and starts with the user, as the Messages API expects."""
    out: list[dict[str, str]] = []
    for turn in turns:
        text = turn.text.strip()
        if not text:
            continue
        if out and out[-1]["role"] == turn.role:
            out[-1]["content"] += "\n\n" + text
        else:
            out.append({"role": turn.role, "content": text})
    while out and out[0]["role"] == "assistant":
        out.pop(0)
    return out


def _num(value: Any) -> float:
    try:
        return max(0.0, float(value))
    except (TypeError, ValueError):
        return 0.0


def _to_estimate(result: dict[str, Any], default_name: str) -> NutritionEstimate:
    alternatives = [
        NutritionAlternative(
            name=str(item.get("name") or "Unknown"),
            calories=_num(item.get("calories")) if item.get("calories") is not None else None,
        )
        for item in result.get("alternatives") or []
        if isinstance(item, dict)
    ]
    fiber = result.get("fiber")
    return NutritionEstimate(
        name=str(result.get("name") or default_name),
        name_urdu=result.get("nameUrdu") or result.get("name_urdu"),
        calories=_num(result.get("calories")),
        protein=_num(result.get("protein")),
        carbs=_num(result.get("carbs")),
        fat=_num(result.get("fat")),
        fiber=_num(fiber) if fiber is not None else None,
        serving_size=str(result.get("servingSize") or result.get("serving_size") or "1 serving"),
        confidence=min(1.0, _num(result.get("confidence"))),
        alternatives=alternatives,
        notes=result.get("notes"),
    )
