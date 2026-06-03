from typing import Any

from fastapi import HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.requests import Request


class ApiEnvelope(BaseModel):
    success: bool
    data: Any | None = None
    error: str | None = None


def envelope(data: Any = None) -> dict[str, Any]:
    return {"success": True, "data": jsonable_encoder(data), "error": None}


def error_envelope(error: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "data": None, "error": error},
    )


async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else jsonable_encoder(exc.detail)
    return error_envelope(str(detail), exc.status_code)


async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return error_envelope(str(exc.errors()), status.HTTP_422_UNPROCESSABLE_ENTITY)


async def generic_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    return error_envelope(str(exc), status.HTTP_500_INTERNAL_SERVER_ERROR)
