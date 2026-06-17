from pydantic import BaseModel, UUID4
from datetime import date

class WorkoutLogRequest(BaseModel):
    athlete_id: UUID4
    log_date: date
    workout_completed: bool
    cardio_logged: int

class WorkoutLogResponse(BaseModel):
    athlete_id: UUID4
    log_date: date
    workout_completed: bool
    cardio_logged: int
