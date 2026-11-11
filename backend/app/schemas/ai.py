from typing import Literal

from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(max_length=4000)


class CoachContext(BaseModel):
    user_name: str | None = Field(default=None, max_length=80)
    remaining_calories: float | None = None
    protein: float | None = None
    carbs: float | None = None
    fat: float | None = None
    goal: str | None = Field(default=None, max_length=40)
    water_count: int | None = None
    local_time: str | None = Field(default=None, max_length=20)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    context: CoachContext = Field(default_factory=CoachContext)
    history: list[ChatTurn] = Field(default_factory=list, max_length=40)


class ChatResponse(BaseModel):
    replies: list[str]  # one chat bubble each, in order
    reply: str  # all bubbles joined, for older app builds


class AdviceRequest(BaseModel):
    remaining_calories: float
    time_of_day: Literal["morning", "afternoon", "evening", "night"]
    goal: str = Field(default="maintain", max_length=40)
    water_count: int = 0


class AdviceResponse(BaseModel):
    text: str


class MealEstimateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)


class NutritionAlternative(BaseModel):
    name: str
    calories: float | None = None


class NutritionEstimate(BaseModel):
    """Same shape as the app's FoodIdentificationResult."""

    name: str
    name_urdu: str | None = None
    calories: float = Field(ge=0)
    protein: float = Field(ge=0)
    carbs: float = Field(ge=0)
    fat: float = Field(ge=0)
    fiber: float | None = None
    serving_size: str = "1 serving"
    confidence: float = Field(ge=0, le=1)
    alternatives: list[NutritionAlternative] = Field(default_factory=list)
    notes: str | None = None
