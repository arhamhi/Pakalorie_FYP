from pydantic import BaseModel, Field


class ModifierOut(BaseModel):
    id: int
    name: str
    kcal_delta: float
    description: str | None = None


class PortionOut(BaseModel):
    id: int
    label: str
    weight_g: float | None
    is_default: bool
    calories_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float | None = None


class FoodSearchResult(BaseModel):
    id: str
    name_en: str
    name_ur: str | None = None
    category: str | None = None
    source: str
    default_portion: PortionOut | None = None
    score: float | None = None


class FoodDetail(BaseModel):
    id: str
    name_en: str
    name_ur: str | None = None
    category: str | None = None
    source: str
    base_unit: str
    aliases: list[str]
    portions: list[PortionOut]
    modifiers: list[ModifierOut]


class NutritionRequest(BaseModel):
    portion: str = Field(..., description="Portion id or label from this food's portion list.")
    modifiers: list[str] = Field(default_factory=list)


class NutritionResponse(BaseModel):
    food_id: str
    food_label: str
    portion: PortionOut
    modifiers: list[ModifierOut]
    calories_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float | None = None
    formula: str
