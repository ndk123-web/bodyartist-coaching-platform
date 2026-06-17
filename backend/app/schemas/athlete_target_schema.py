from pydantic import BaseModel, UUID4, Field
from typing import Dict, List, Any, Optional
from datetime import datetime

class TargetMacros(BaseModel):
    protein: float
    carbs: float
    fat: float

class AthleteTargetResponse(BaseModel):
    athlete_id: UUID4
    # Alias is used because model has meals_target but JSON requires target_meals
    target_meals: int = Field(validation_alias="meals_target")
    water_target: int
    steps_target: int
    cardio_target: int
    tolerance_percent: int
    target_macros: List[Dict[str, Any]]
    supplement_checklist: List[Dict[str, Any]]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True
