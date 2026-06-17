from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.config.database import get_db
from backend.app.schemas.water_log_schema import WaterLogRequest, DailyLogResponse, WeightLogRequest
from backend.app.services.water_log_service import WaterLogService

router = APIRouter(
    prefix="/api/v1/logs",
    tags=["Logs"]
)

@router.put("/water", response_model=DailyLogResponse, status_code=status.HTTP_200_OK)
def upsert_water_log(data: WaterLogRequest, db: Session = Depends(get_db)):
    service = WaterLogService(db)
    return service.log_water(data)

@router.put("/weight", response_model=DailyLogResponse, status_code=status.HTTP_200_OK)
def upsert_weight_log(data: WeightLogRequest, db: Session = Depends(get_db)):
    service = WaterLogService(db)
    return service.log_weight(data)
