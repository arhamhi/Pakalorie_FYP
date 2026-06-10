from fastapi import APIRouter, File, UploadFile
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.responses import envelope
from app.schemas.common import ApiResponse
from app.schemas.depth import PortionEstimate
from app.services.depth import DepthEstimator

router = APIRouter(tags=["depth"])


@router.post("/portion", response_model=ApiResponse[PortionEstimate])
async def portion(image: UploadFile = File(...)):
    image_bytes = await image.read()
    estimator = DepthEstimator(get_settings())
    # ONNX inference is CPU-bound; keep the event loop free.
    result = await run_in_threadpool(estimator.estimate, image_bytes)
    return envelope(result)
