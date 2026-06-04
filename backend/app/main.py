from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from starlette.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.responses import (
    generic_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.core.settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Pakalorie Backend",
        version="0.1.0",
        description=(
            "Food recognition, food database, and grounded calorie engine for Pakalorie FYP."
        ),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_literal_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    @app.get("/healthz", tags=["health"])
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(api_router)
    return app


app = create_app()
