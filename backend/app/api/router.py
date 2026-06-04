from fastapi import APIRouter

from app.api.routes import calories, foods, recognition

api_router = APIRouter()
api_router.include_router(foods.router)
api_router.include_router(recognition.router)
api_router.include_router(calories.router)
