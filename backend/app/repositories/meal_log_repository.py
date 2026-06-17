from backend.app.models.meal_logs import MealLog
from uuid import UUID
from typing import List

class MealLogRepository:
    def get_athlete_meals_desc(self, db, athlete_id: UUID) -> List[MealLog]:
        return (
            db.query(MealLog)
            .filter(MealLog.athlete_id == athlete_id)
            .order_by(MealLog.logged_at.desc())
            .all()
        )

    def get_today_athlete_meals_desc(self, db, athlete_id: UUID) -> List[MealLog]:
        from datetime import date, datetime, time
        today_start = datetime.combine(date.today(), time.min)
        today_end = datetime.combine(date.today(), time.max)
        return (
            db.query(MealLog)
            .filter(
                MealLog.athlete_id == athlete_id, 
                MealLog.logged_at >= today_start,
                MealLog.logged_at <= today_end
            )
            .order_by(MealLog.logged_at.desc())
            .all()
        )

