from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.config.database import get_db
from backend.app.schemas.workout_log_schema import WorkoutLogRequest, WorkoutLogResponse, CardioLogRequest
from backend.app.schemas.water_log_schema import DailyLogResponse
from backend.app.services.workout_log_service import WorkoutLogService

router = APIRouter(
    prefix="/api/v1/logs",
    tags=["Logs"]
)

@router.put("/workout", response_model=WorkoutLogResponse, status_code=status.HTTP_200_OK)
def upsert_workout_log(data: WorkoutLogRequest, db: Session = Depends(get_db)):
    service = WorkoutLogService(db)
    return service.log_workout(data)

@router.put("/cardio", response_model=DailyLogResponse, status_code=status.HTTP_200_OK)
def upsert_cardio_log(data: CardioLogRequest, db: Session = Depends(get_db)):
    service = WorkoutLogService(db)
    return service.log_cardio(data)
