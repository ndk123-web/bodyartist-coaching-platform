from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional
from datetime import date

from backend.app.config.database import get_db
from backend.app.schemas.dashboard_schema import DashboardSummaryResponse, AthleteDetailResponse
from backend.app.services.dashboard_service import DashboardService

router = APIRouter(
    prefix="/api/v1/athlete",
    tags=["Dashboard"]
)

@router.get("/dashboard-summary/{athlete_id}", response_model=DashboardSummaryResponse, status_code=status.HTTP_200_OK)
def get_dashboard_summary(athlete_id: UUID, db: Session = Depends(get_db)):
    service = DashboardService(db)
    return service.get_dashboard_summary(athlete_id)

@router.get("/coach-detail/{athlete_id}", response_model=AthleteDetailResponse, status_code=status.HTTP_200_OK)
def get_coach_athlete_detail(athlete_id: UUID, log_date: Optional[date] = None, db: Session = Depends(get_db)):
    service = DashboardService(db)
    return service.get_coach_athlete_detail(athlete_id, log_date)

from backend.app.schemas.water_log_schema import DailyLogResponse
from backend.app.schemas.dashboard_schema import HeatmapPoint, ChartPoint
from typing import List

@router.get("/daily-log/{athlete_id}", response_model=DailyLogResponse, status_code=status.HTTP_200_OK)
def get_daily_log(athlete_id: UUID, log_date: Optional[date] = None, db: Session = Depends(get_db)):
    service = DashboardService(db)
    return service.get_daily_log(athlete_id, log_date)

@router.get("/heatmap/{athlete_id}", response_model=List[HeatmapPoint], status_code=status.HTTP_200_OK)
def get_athlete_heatmap(athlete_id: UUID, db: Session = Depends(get_db)):
    service = DashboardService(db)
    return service.get_athlete_heatmap(athlete_id)

@router.get("/weight-history/{athlete_id}", response_model=List[ChartPoint], status_code=status.HTTP_200_OK)
def get_weight_history(athlete_id: UUID, db: Session = Depends(get_db)):
    service = DashboardService(db)
    return service.get_weight_history(athlete_id)
