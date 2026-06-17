from backend.app.models.daily_log_model import DailyLog
from uuid import UUID
from datetime import date, timedelta

class DailyLogRepository:
    def upsert_water_log(self, db, athlete_id: UUID, log_date: date, water_logged: int) -> DailyLog:
        # Find if log exists for the athlete on the specific date
        daily_log = db.query(DailyLog).filter(
            DailyLog.athlete_id == athlete_id,
            DailyLog.log_date == log_date
        ).first()

        if daily_log:
            # Update
            daily_log.water_logged = water_logged
        else:
            # Create
            daily_log = DailyLog(
                athlete_id=athlete_id,
                log_date=log_date,
                water_logged=water_logged
            )
            db.add(daily_log)
        
        db.commit()
        db.refresh(daily_log)
        
        return daily_log

    def upsert_supplement_log(self, db, athlete_id: UUID, log_date: date, supplement_checkoffs: list) -> DailyLog:
        daily_log = db.query(DailyLog).filter(
            DailyLog.athlete_id == athlete_id,
            DailyLog.log_date == log_date
        ).first()

        if daily_log:
            daily_log.supplement_checkoffs = supplement_checkoffs
        else:
            daily_log = DailyLog(
                athlete_id=athlete_id,
                log_date=log_date,
                supplement_checkoffs=supplement_checkoffs
            )
            db.add(daily_log)
        
        db.commit()
        db.refresh(daily_log)
        return daily_log

    def upsert_workout_log(self, db, athlete_id: UUID, log_date: date, workout_completed: bool, cardio_logged: int) -> DailyLog:
        daily_log = db.query(DailyLog).filter(
            DailyLog.athlete_id == athlete_id,
            DailyLog.log_date == log_date
        ).first()

        if daily_log:
            daily_log.workout_completed = workout_completed
            daily_log.cardio_logged = cardio_logged
        else:
            daily_log = DailyLog(
                athlete_id=athlete_id,
                log_date=log_date,
                workout_completed=workout_completed,
                cardio_logged=cardio_logged
            )
            db.add(daily_log)
        
        db.commit()
        db.refresh(daily_log)
        return daily_log

    def upsert_step_log(self, db, athlete_id: UUID, log_date: date, steps_logged: int) -> DailyLog:
        daily_log = db.query(DailyLog).filter(
            DailyLog.athlete_id == athlete_id,
            DailyLog.log_date == log_date
        ).first()

        if daily_log:
            daily_log.steps_logged = steps_logged
        else:
            daily_log = DailyLog(
                athlete_id=athlete_id,
                log_date=log_date,
                steps_logged=steps_logged
            )
            db.add(daily_log)
        
        db.commit()
        db.refresh(daily_log)
        return daily_log

    def upsert_weight_log(self, db, athlete_id: UUID, log_date: date, weight: float) -> DailyLog:
        daily_log = db.query(DailyLog).filter(
            DailyLog.athlete_id == athlete_id,
            DailyLog.log_date == log_date
        ).first()

        if daily_log:
            daily_log.weight = weight
        else:
            daily_log = DailyLog(
                athlete_id=athlete_id,
                log_date=log_date,
                weight=weight
            )
            db.add(daily_log)
        
        db.commit()
        db.refresh(daily_log)
        return daily_log

    def get_log_by_date(self, db, athlete_id: UUID, log_date: date) -> DailyLog:
        return db.query(DailyLog).filter(
            DailyLog.athlete_id == athlete_id,
            DailyLog.log_date == log_date
        ).first()

    def get_current_streak(self, db, athlete_id: UUID) -> int:
        logs = db.query(DailyLog.log_date).filter(
            DailyLog.athlete_id == athlete_id
        ).order_by(DailyLog.log_date.desc()).all()
        
        if not logs:
            return 0
            
        dates = [log[0] for log in logs]
        today = date.today()
        streak = 0
        
        if dates[0] == today or dates[0] == today - timedelta(days=1):
            streak = 1
            current_check_date = dates[0]
            
            for i in range(1, len(dates)):
                if dates[i] == current_check_date - timedelta(days=1):
                    streak += 1
                    current_check_date = dates[i]
                else:
                    break
        return streak

    def get_logs_in_range(self, db, athlete_id: UUID, start_date: date, end_date: date):
        return db.query(DailyLog).filter(
            DailyLog.athlete_id == athlete_id,
            DailyLog.log_date >= start_date,
            DailyLog.log_date <= end_date
        ).order_by(DailyLog.log_date.asc()).all()
