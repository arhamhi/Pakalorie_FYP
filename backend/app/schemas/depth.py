from typing import Literal

from pydantic import BaseModel


class DepthStats(BaseModel):
    center_mean: float
    border_mean: float
    prominence: float
    near_fill_fraction: float
    score: float


class PortionEstimate(BaseModel):
    bucket: Literal["small", "medium", "large"]
    multiplier: float
    depth_stats: DepthStats
    why: str
    limitations: str
    model_used: str
