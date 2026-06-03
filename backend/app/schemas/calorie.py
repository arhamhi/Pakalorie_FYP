from pydantic import BaseModel, Field


class CalorieRequest(BaseModel):
    recognized_dish: str = Field(..., min_length=1)
    portion: str | None = Field(
        default=None,
        description="Specific portion label/id, or a future MiDaS bucket: small, medium, large.",
    )
    modifiers: list[str] = Field(default_factory=list)
    top_k: int = Field(default=3, ge=1, le=10)


class RetrievedSourceRow(BaseModel):
    food_id: str
    food_label: str
    source: str
    portion_id: int
    portion_label: str
    weight_g: float | None
    calories_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float | None = None
    modifiers: list[dict[str, float | str]]
    score: float | None = None


class CalorieBreakdown(BaseModel):
    food_id: str
    food_label: str
    portion_label: str
    calories_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float | None = None
    applied_modifiers: list[str]
    ignored_modifiers: list[str]
    why: str
    model_used: str
    source_rows: list[RetrievedSourceRow]
