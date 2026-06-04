from pydantic import BaseModel, Field


class RecognitionAlternative(BaseModel):
    food_label: str
    confidence: float | None = Field(default=None, ge=0, le=1)


class RecognitionResponse(BaseModel):
    food_label: str
    confidence: float = Field(ge=0, le=1)
    alternatives: list[RecognitionAlternative] = Field(default_factory=list)
