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
        
        return self.recalculate_and_save_score(db, athlete_id, log_date)

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
        return self.recalculate_and_save_score(db, athlete_id, log_date)

    def upsert_workout_log(self, db, athlete_id: UUID, log_date: date, workout_completed: bool, cardio_completed: bool) -> DailyLog:
        daily_log = db.query(DailyLog).filter(
            DailyLog.athlete_id == athlete_id,
            DailyLog.log_date == log_date
        ).first()

        if daily_log:
            daily_log.workout_completed = workout_completed
            daily_log.cardio_completed = cardio_completed
        else:
            daily_log = DailyLog(
                athlete_id=athlete_id,
                log_date=log_date,
                workout_completed=workout_completed,
                cardio_completed=cardio_completed
            )
            db.add(daily_log)
        
        db.commit()
        db.refresh(daily_log)
        return self.recalculate_and_save_score(db, athlete_id, log_date)

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
        return self.recalculate_and_save_score(db, athlete_id, log_date)

    def upsert_cardio_log(self, db, athlete_id: UUID, log_date: date, cardio_logged: int) -> DailyLog:
        daily_log = db.query(DailyLog).filter(
            DailyLog.athlete_id == athlete_id,
            DailyLog.log_date == log_date
        ).first()

        if daily_log:
            daily_log.cardio_logged = cardio_logged
        else:
            daily_log = DailyLog(
                athlete_id=athlete_id,
                log_date=log_date,
                cardio_logged=cardio_logged
            )
            db.add(daily_log)
        
        db.commit()
        db.refresh(daily_log)
        return self.recalculate_and_save_score(db, athlete_id, log_date)

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
        return self.recalculate_and_save_score(db, athlete_id, log_date)

    def recalculate_and_save_score(self, db, athlete_id: UUID, log_date: date) -> DailyLog:
        from backend.app.models.daily_log_model import DailyLog
        from backend.app.models.diet_plan_model import DietPlan
        from backend.app.models.meal_log_model import MealLog
        from sqlalchemy import cast, Date

        # 1. Fetch daily log
        daily_log = db.query(DailyLog).filter(
            DailyLog.athlete_id == athlete_id,
            DailyLog.log_date == log_date
        ).first()

        if not daily_log:
            daily_log = DailyLog(
                athlete_id=athlete_id,
                log_date=log_date,
                water_logged=0,
                steps_logged=0,
                cardio_logged=0,
                weight=None,
                supplement_checkoffs=[]
            )
            db.add(daily_log)

        # 2. Fetch diet plan targets
        diet_plan = db.query(DietPlan).filter(DietPlan.athlete_id == athlete_id).first()
        if diet_plan:
            meals_target = diet_plan.meals_target or 5
            water_target = diet_plan.water_target or 8
            steps_target = diet_plan.steps_target or 10000
            cardio_target = diet_plan.cardio_target or 30
            supplement_checklist = diet_plan.supplement_checklist or []
        else:
            meals_target = 5
            water_target = 8
            steps_target = 10000
            cardio_target = 30
            supplement_checklist = []

        # 3. Fetch meal logs count
        meals_logged = db.query(MealLog).filter(
            MealLog.athlete_id == athlete_id,
            cast(MealLog.logged_at, Date) == log_date
        ).count()

        # 4. Supplement checkoffs completion flags
        supplement_checkoffs = daily_log.supplement_checkoffs or []
        completed_supp_names = {
            c["name"] for c in supplement_checkoffs if c.get("completed")
        }

        # Calculate scores
        # A. Meal Adherence (50%)
        meal_score = (
            min(100.0, (meals_logged / meals_target) * 100.0)
            if meals_target > 0
            else 100.0
        )

        # B. Supplements (20%)
        required_supps = [s for s in supplement_checklist if s.get("required", True)]
        completed_required_supps = [s for s in required_supps if s.get("name") in completed_supp_names]
        supp_score = (
            (len(completed_required_supps) / len(required_supps)) * 100.0
            if required_supps
            else 100.0
        )

        # C. Hydration (15%)
        water_score = 100.0 if (daily_log.water_logged or 0) >= water_target else 0.0

        # D. Workout (15%)
        steps_pct = (
            min(100.0, ((daily_log.steps_logged or 0) / steps_target) * 100.0)
            if steps_target > 0
            else 100.0
        )
        cardio_pct = (
            min(100.0, ((daily_log.cardio_logged or 0) / cardio_target) * 100.0)
            if cardio_target > 0
            else 100.0
        )
        workout_score = (steps_pct + cardio_pct) / 2.0

        total_score = int(
            round(
                (meal_score * 0.50)
                + (supp_score * 0.20)
                + (water_score * 0.15)
                + (workout_score * 0.15)
            )
        )

        if total_score >= 85:
            status = "green"
        elif total_score >= 70:
            status = "yellow"
        elif total_score >= 50:
            status = "orange"
        else:
            status = "red"

        daily_log.score = total_score
        daily_log.status = status
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
