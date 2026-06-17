from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.config.database import get_db
from backend.app.schemas.body_metrics_schema import WeightLogRequest, WeightLogResponse
from backend.app.models.body_metrics_model import BodyMetric
from backend.app.models.daily_log_model import DailyLog

router = APIRouter(
    prefix="/api/v1/logs",
    tags=["Logs"]
)

@router.put("/weight", response_model=WeightLogResponse, status_code=status.HTTP_200_OK)
def upsert_weight_log(data: WeightLogRequest, db: Session = Depends(get_db)):
    # Upsert BodyMetric
    metric = db.query(BodyMetric).filter(
        BodyMetric.athlete_id == data.athlete_id,
        BodyMetric.log_date == data.log_date
    ).first()

    if metric:
        metric.weight = data.weight
    else:
        metric = BodyMetric(
            athlete_id=data.athlete_id,
            log_date=data.log_date,
            weight=data.weight
        )
        db.add(metric)
        
    # Also update the daily_logs table for quick dashboard access
    daily_log = db.query(DailyLog).filter(
        DailyLog.athlete_id == data.athlete_id,
        DailyLog.log_date == data.log_date
    ).first()
    
    if daily_log:
        daily_log.weight = data.weight
    else:
        daily_log = DailyLog(
            athlete_id=data.athlete_id,
            log_date=data.log_date,
            weight=data.weight
        )
        db.add(daily_log)
        
    db.commit()
    db.refresh(metric)
    return metric
