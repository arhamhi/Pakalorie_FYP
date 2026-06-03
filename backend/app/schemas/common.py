from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: T | None = None
    error: str | None = None


class ErrorEnvelope(BaseModel):
    success: bool = False
    data: None = None
    error: str


class SuccessEnvelope(BaseModel, Generic[T]):
    success: bool = True
    data: T
    error: None = None
