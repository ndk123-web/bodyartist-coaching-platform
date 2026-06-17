from pydantic import BaseModel, UUID4
from typing import List, Dict, Any, Optional
from datetime import datetime

class MealLogItem(BaseModel):
    id: UUID4
    photo_url: Optional[str] = None
    food_name: str
    confidence_score: Optional[float] = None
    logged_at: datetime
    estimated_calories: Optional[float] = None
    estimated_protein: Optional[float] = None
    estimated_carbs: Optional[float] = None
    estimated_fat: Optional[float] = None
    estimated_micronutrients: Dict[str, Any] = {}
    is_edited: bool = False

    class Config:
        from_attributes = True

class MealHistoryResponse(BaseModel):
    athlete_id: UUID4
    total_meals: int
    meals: List[MealLogItem]
