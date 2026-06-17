from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date, timedelta
from fastapi import HTTPException
from typing import List

from backend.app.repositories.daily_log_repository import DailyLogRepository
from backend.app.repositories.diet_plan_repository import DietPlanRepository
from backend.app.schemas.dashboard_schema import (
    DashboardSummaryResponse,
    AthleteDetailResponse,
    SupplementDetail,
    MealHistoryDetail,
    ChartPoint,
    HeatmapPoint,
    TeamAnalyticsResponse,
)
from backend.app.models.daily_log_model import DailyLog


class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.daily_log_repo = DailyLogRepository()
        self.diet_plan_repo = DietPlanRepository()

    def get_dashboard_summary(self, athlete_id: UUID) -> DashboardSummaryResponse:
        today = date.today()

        # Get today's log
        daily_log = self.daily_log_repo.get_log_by_date(self.db, athlete_id, today)

        # Get diet plan for supplement total
        diet_plan = self.diet_plan_repo.get_by_athlete_id(self.db, athlete_id)

        # Calculate streak
        current_streak = self.daily_log_repo.get_current_streak(self.db, athlete_id)

        water_logged = 0
        supplements_completed = 0
        supplements_total = 0

        if diet_plan and diet_plan.supplement_checklist:
            required_supps = [
                s for s in diet_plan.supplement_checklist if s.get("required")
            ]
            supplements_total = len(required_supps)

        if daily_log and daily_log.supplement_checkoffs:
            # checkoffs array is assumed to only contain completed items
            supplements_completed = sum(
                1 for s in daily_log.supplement_checkoffs if s.get("completed")
            )
            water_logged = daily_log.water_logged

        return DashboardSummaryResponse(
            athlete_id=athlete_id,
            water_logged=water_logged,
            supplements_completed=supplements_completed,
            supplements_total=supplements_total,
            current_streak=current_streak,
        )

    def get_coach_athlete_detail(
        self, athlete_id: UUID, log_date: date = None
    ) -> AthleteDetailResponse:
        from backend.app.repositories.user_repository import UserRepository
        from backend.app.models.meal_log_model import MealLog
        from sqlalchemy import cast, Date

        # 1. Fetch user (athlete)
        athlete = UserRepository.get_by_id(self.db, athlete_id)
        if not athlete or athlete.role != "athlete":
            raise HTTPException(status_code=404, detail="Athlete not found")

        current_today = date.today()
        today = log_date if log_date is not None else current_today

        # 2. Fetch diet plan targets
        diet_plan = self.diet_plan_repo.get_by_athlete_id(self.db, athlete_id)
        if diet_plan:
            meals_target = diet_plan.meals_target or 5
            water_target = diet_plan.water_target or 8
            steps_target = diet_plan.steps_target or 10000
            cardio_target = diet_plan.cardio_target or 30
            supplement_checklist = diet_plan.supplement_checklist or []
            db_macros = diet_plan.target_macros
            if isinstance(db_macros, dict):
                target_macros = [
                    {"name": k.capitalize(), "value": v, "unit": "g"}
                    for k, v in db_macros.items()
                ]
            elif isinstance(db_macros, list):
                target_macros = db_macros
            else:
                target_macros = []
        else:
            meals_target = 5
            water_target = 8
            steps_target = 10000
            cardio_target = 30
            supplement_checklist = [
                {"name": "Creatine Monohydrate", "completed": False, "required": True},
                {"name": "Omega 3 Fish Oil", "completed": False, "required": True},
                {"name": "Multivitamin Formula", "completed": False, "required": True},
            ]
            target_macros = [
                {"name": "Protein", "value": 200, "unit": "g"},
                {"name": "Carbs", "value": 250, "unit": "g"},
                {"name": "Fat", "value": 75, "unit": "g"},
            ]

        # 3. Fetch today's daily log
        daily_log = self.daily_log_repo.get_log_by_date(self.db, athlete_id, today)
        if daily_log:
            water_logged = daily_log.water_logged or 0
            steps_logged = daily_log.steps_logged or 0
            cardio_logged = daily_log.cardio_logged or 0
            weight = float(daily_log.weight) if daily_log.weight is not None else 80.0
            supplement_checkoffs = daily_log.supplement_checkoffs or []
        else:
            water_logged = 0
            steps_logged = 0
            cardio_logged = 0
            weight = 80.0
            supplement_checkoffs = []

        # 4. Fetch today's meal logs from DB
        today_meals = (
            self.db.query(MealLog)
            .filter(
                MealLog.athlete_id == athlete_id, cast(MealLog.logged_at, Date) == today
            )
            .order_by(MealLog.logged_at.desc())
            .all()
        )
        meals_logged = len(today_meals)

        # 5. Format today's meal history timeline
        meal_history = []
        for m in today_meals:
            # Safely get macros from JSONB confirmed_macros
            macros = m.confirmed_macros or {}
            protein = macros.get("protein", 0)
            carbs = macros.get("carbs", 0)
            fat = macros.get("fat", 0)
            calories = macros.get("calories", 0)
            if not calories:
                calories = int(protein * 4 + carbs * 4 + fat * 9)

            meal_history.append(
                MealHistoryDetail(
                    id=str(m.id),
                    time=m.logged_at.strftime("%H:%M"),
                    food=m.raw_food_log or "Unknown Meal",
                    macros={"p": int(protein), "c": int(carbs), "f": int(fat)},
                    calories=int(calories),
                    photo=m.photo_url,
                    confidence=int((m.confidence_score or 0.0) * 100),
                    isEdited=macros.get("is_edited", False),
                )
            )

        # 6. Construct supplement checklist state with completion flags
        completed_supp_names = {
            c["name"] for c in supplement_checkoffs if c.get("completed")
        }

        supplements = []
        for s in supplement_checklist:
            supplements.append(
                SupplementDetail(
                    name=s.get("name", ""),
                    completed=s.get("name", "") in completed_supp_names,
                    required=s.get("required", True),
                )
            )

        # 7. Calculate daily score and status
        # A. Meal Adherence (50%)
        meal_score = (
            min(100.0, (meals_logged / meals_target) * 100.0)
            if meals_target > 0
            else 100.0
        )
        # B. Supplements (20%)
        required_supps = [s for s in supplements if s.required]
        completed_required_supps = [s for s in required_supps if s.completed]
        supp_score = (
            (len(completed_required_supps) / len(required_supps)) * 100.0
            if required_supps
            else 100.0
        )
        # C. Hydration (15%)
        water_score = 100.0 if water_logged >= water_target else 0.0
        # D. Workout (15%)
        steps_pct = (
            min(100.0, (steps_logged / steps_target) * 100.0)
            if steps_target > 0
            else 100.0
        )
        cardio_pct = (
            min(100.0, (cardio_logged / cardio_target) * 100.0)
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

        # Determine status bucket
        if total_score >= 85:
            status = "green"
        elif total_score >= 70:
            status = "yellow"
        elif total_score >= 50:
            status = "orange"
        else:
            status = "red"

        # Update the daily log with the latest score and status if it exists, or just set it
        if daily_log:
            daily_log.score = total_score
            daily_log.status = status
            self.db.commit()

        # 8. Calculate current adherence streak
        streak = self.daily_log_repo.get_current_streak(self.db, athlete_id)

        # 9. Get weight history and water history for the past daily logs
        past_logs = (
            self.db.query(DailyLog)
            .filter(DailyLog.athlete_id == athlete_id)
            .order_by(DailyLog.log_date.desc())
            .limit(15)
            .all()
        )

        past_logs_sorted = sorted(past_logs, key=lambda l: l.log_date)

        weight_history = []
        water_history = []

        # Populate weight logs (up to 7)
        weights_found = 0
        for log in reversed(past_logs_sorted):
            if log.weight is not None and weights_found < 7:
                weight_history.append(
                    ChartPoint(
                        date=log.log_date.strftime("%m-%d"), value=float(log.weight)
                    )
                )
                weights_found += 1
        weight_history.reverse()

        # If no weights found, pad with current weight
        if not weight_history:
            weight_history = [ChartPoint(date=today.strftime("%m-%d"), value=weight)]

        # Hydration history (last 7 logs)
        for log in past_logs_sorted[-7:]:
            water_history.append(
                ChartPoint(
                    date=log.log_date.strftime("%m-%d"), value=log.water_logged or 0
                )
            )

        if not water_history:
            water_history = [
                ChartPoint(date=today.strftime("%m-%d"), value=water_logged)
            ]

        # 10. Get heatmap compliance from all athlete daily logs
        all_logs = (
            self.db.query(DailyLog).filter(DailyLog.athlete_id == athlete_id).all()
        )
        heatmap_data = [
            HeatmapPoint(date=log.log_date.strftime("%Y-%m-%d"), score=log.score or 0)
            for log in all_logs
        ]

        return AthleteDetailResponse(
            id=athlete_id,
            name=athlete.name,
            email=athlete.email,
            score=total_score,
            streak=streak,
            weight=weight,
            waterLog=water_logged,
            waterTarget=water_target,
            mealsLogged=meals_logged,
            mealsTarget=meals_target,
            supplements=supplements,
            status=status,
            mealHistory=meal_history,
            weightHistory=weight_history,
            waterHistory=water_history,
            heatmapData=heatmap_data,
            stepsLogged=steps_logged,
            cardioLogged=cardio_logged,
            created_at=athlete.created_at,
            dietMealsTarget=meals_target,
            dietWaterTarget=water_target,
            dietStepsTarget=steps_target,
            dietCardioTarget=cardio_target,
            dietTargetMacros=target_macros,
        )

    def get_daily_log(self, athlete_id: UUID, log_date: date = None) -> DailyLog:
        if log_date is None:
            log_date = date.today()

        daily_log = self.daily_log_repo.get_log_by_date(self.db, athlete_id, log_date)
        if not daily_log:
            daily_log = DailyLog(
                athlete_id=athlete_id,
                log_date=log_date,
                water_logged=0,
                steps_logged=0,
                cardio_logged=0,
                weight=None,
                score=0,
                status="pending",
                supplement_checkoffs=[],
            )
        return daily_log

    def get_athlete_heatmap(self, athlete_id: UUID) -> List[HeatmapPoint]:
        logs = self.db.query(DailyLog).filter(DailyLog.athlete_id == athlete_id).all()
        return [
            HeatmapPoint(date=log.log_date.strftime("%Y-%m-%d"), score=log.score or 0)
            for log in logs
        ]

    def get_weight_history(self, athlete_id: UUID) -> List[ChartPoint]:
        past_logs = (
            self.db.query(DailyLog)
            .filter(DailyLog.athlete_id == athlete_id)
            .order_by(DailyLog.log_date.desc())
            .limit(15)
            .all()
        )

        past_logs_sorted = sorted(past_logs, key=lambda l: l.log_date)
        weight_history = []
        weights_found = 0
        for log in reversed(past_logs_sorted):
            if log.weight is not None and weights_found < 7:
                weight_history.append(
                    ChartPoint(
                        date=log.log_date.strftime("%m-%d"), value=float(log.weight)
                    )
                )
                weights_found += 1
        weight_history.reverse()
        return weight_history

    def get_team_analytics(self, coach_id: UUID) -> TeamAnalyticsResponse:
        from backend.app.repositories.user_repository import UserRepository
        from sqlalchemy import func
        from datetime import date, timedelta

        # Get all athletes for this coach
        athletes = UserRepository.get_athletes_by_coach(self.db, coach_id)
        if not athletes:
            return TeamAnalyticsResponse(team_heatmap=[], team_trend=[])

        athlete_ids = [a.id for a in athletes]

        end_date = date.today()
        start_date = end_date - timedelta(days=83)  # 12 weeks is 84 days (inclusive)

        # Query average score grouped by log_date
        daily_averages = (
            self.db.query(
                DailyLog.log_date,
                func.avg(DailyLog.score).label("avg_score")
            )
            .filter(
                DailyLog.athlete_id.in_(athlete_ids),
                DailyLog.log_date >= start_date,
                DailyLog.log_date <= end_date
            )
            .group_by(DailyLog.log_date)
            .all()
        )

        team_heatmap = [
            HeatmapPoint(
                date=row.log_date.strftime("%Y-%m-%d"),
                score=int(round(row.avg_score))
            )
            for row in daily_averages
        ]

        # Trend points for the last 7 days
        avg_score_by_date = {row.log_date: row.avg_score for row in daily_averages}
        team_trend = []
        for i in range(7):
            d = end_date - timedelta(days=6 - i)
            val = avg_score_by_date.get(d, 0.0)
            team_trend.append(
                ChartPoint(
                    date=d.strftime("%m/%d"),
                    value=float(round(val, 1))
                )
            )

        return TeamAnalyticsResponse(
            team_heatmap=team_heatmap,
            team_trend=team_trend
        )

