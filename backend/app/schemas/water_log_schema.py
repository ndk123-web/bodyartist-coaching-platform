from pydantic import BaseModel, Field, UUID4
from datetime import date
from typing import Optional, List, Dict, Any

class WaterLogRequest(BaseModel):
    athlete_id: UUID4
    log_date: date
    water_logged: int = Field(..., gt=0, description="Water logged must be greater than 0")

class WeightLogRequest(BaseModel):
    athlete_id: UUID4
    log_date: date
    weight: float = Field(..., gt=0.0, description="Weight logged must be greater than 0.0")

class DailyLogResponse(BaseModel):
    id: Optional[UUID4] = None
    athlete_id: UUID4
    log_date: date
    water_logged: int
    steps_logged: int
    cardio_logged: int
    weight: Optional[float] = None
    score: int
    status: str
    supplement_checkoffs: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True
