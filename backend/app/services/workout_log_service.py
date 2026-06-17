from sqlalchemy.orm import Session
from backend.app.repositories.daily_log_repository import DailyLogRepository
from backend.app.schemas.workout_log_schema import WorkoutLogRequest, WorkoutLogResponse, CardioLogRequest
from backend.app.models.daily_log_model import DailyLog

class WorkoutLogService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = DailyLogRepository()

    def log_workout(self, data: WorkoutLogRequest) -> WorkoutLogResponse:
        daily_log = self.repository.upsert_workout_log(
            self.db, 
            athlete_id=data.athlete_id, 
            log_date=data.log_date, 
            workout_completed=data.workout_completed,
            cardio_completed=data.cardio_completed
        )

        return WorkoutLogResponse(
            athlete_id=daily_log.athlete_id,
            log_date=daily_log.log_date,
            workout_completed=daily_log.workout_completed,
            cardio_completed=daily_log.cardio_completed
        )

    def log_cardio(self, data: CardioLogRequest) -> DailyLog:
        return self.repository.upsert_cardio_log(
            self.db,
            athlete_id=data.athlete_id,
            log_date=data.log_date,
            cardio_logged=data.cardio_logged
        )
