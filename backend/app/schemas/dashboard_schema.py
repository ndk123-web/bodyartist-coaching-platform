from pydantic import BaseModel, UUID4
from typing import List, Optional, Dict, Any


class DashboardSummaryResponse(BaseModel):
    athlete_id: UUID4
    water_logged: int
    supplements_completed: int
    supplements_total: int
    current_streak: int
    weight: float
    score: int
    status: str
    meals_logged: int
    meals_target: int
    steps_logged: int
    cardio_logged: int
    supplement_checkoffs: List[Dict[str, Any]]


class SupplementDetail(BaseModel):
    name: str
    completed: bool
    required: bool


class MealHistoryDetail(BaseModel):
    id: str
    time: str
    food: str
    macros: Dict[str, Any]
    calories: int
    photo: Optional[str] = None
    confidence: int
    isEdited: bool


class ChartPoint(BaseModel):
    date: str
    value: float


class HeatmapPoint(BaseModel):
    date: str
    score: int


class AthleteDetailResponse(BaseModel):
    id: UUID4
    name: str
    email: str
    score: int
    streak: int
    weight: float
    waterLog: int
    waterTarget: int
    mealsLogged: int
    mealsTarget: int
    supplements: List[SupplementDetail]
    status: str
    mealHistory: List[MealHistoryDetail]
    weightHistory: List[ChartPoint]
    waterHistory: List[ChartPoint]
    heatmapData: List[HeatmapPoint]
    stepsLogged: int
    cardioLogged: int

    # Target configurations
    dietMealsTarget: int
    dietWaterTarget: int
    dietStepsTarget: int
    dietCardioTarget: int
    dietTargetMacros: List[Dict[str, Any]]
