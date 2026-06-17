from pydantic import BaseModel, UUID4
from datetime import date
from typing import Optional

class WeightLogRequest(BaseModel):
    athlete_id: UUID4
    log_date: date
    weight: float

class WeightLogResponse(BaseModel):
    id: UUID4
    athlete_id: UUID4
    log_date: date
    weight: float
    
    class Config:
        from_attributes = True
