from sqlalchemy.orm import Session
from backend.app.repositories.daily_log_repository import DailyLogRepository
from backend.app.schemas.water_log_schema import WaterLogRequest, WeightLogRequest
from backend.app.models.daily_log_model import DailyLog

class WaterLogService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = DailyLogRepository()

    def log_water(self, data: WaterLogRequest) -> DailyLog:
        return self.repository.upsert_water_log(
            self.db, 
            athlete_id=data.athlete_id, 
            log_date=data.log_date, 
            water_logged=data.water_logged
        )

    def log_weight(self, data: WeightLogRequest) -> DailyLog:
        return self.repository.upsert_weight_log(
            self.db,
            athlete_id=data.athlete_id,
            log_date=data.log_date,
            weight=data.weight
        )
