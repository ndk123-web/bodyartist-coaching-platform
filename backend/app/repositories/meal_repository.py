from decimal import Decimal
from sqlalchemy.orm import Session
from uuid import UUID
from backend.app.models.meal_log_model import MealLog
from backend.app.models.vision_api_call import VisionApiCalls

class MealRepository:
    @staticmethod
    def create_meal_log(
        db: Session,
        athlete_id: UUID,
        food_name: str,
        photo_url: str,
        raw_vision_response: dict,
        confidence_score: float,
        estimated_calories: float,
        estimated_protein: float,
        estimated_carbs: float,
        estimated_fat: float,
        estimated_micronutrients: dict,
        serving_size: float = None,
        is_edited: bool = False
    ) -> MealLog:
        # Pack dynamic properties into confirmed_macros to align with database JSONB column
        confirmed_macros = {
            "calories": float(estimated_calories) if estimated_calories is not None else 0.0,
            "protein": float(estimated_protein) if estimated_protein is not None else 0.0,
            "carbs": float(estimated_carbs) if estimated_carbs is not None else 0.0,
            "fat": float(estimated_fat) if estimated_fat is not None else 0.0,
            "micronutrients": estimated_micronutrients or {},
            "serving_size": float(serving_size) if serving_size is not None else 150.0,
            "is_edited": is_edited,
            "raw_vision_response": raw_vision_response
        }

        db_meal = MealLog(
            athlete_id=athlete_id,
            photo_url=photo_url,
            raw_food_log=food_name,
            confidence_score=float(confidence_score) if confidence_score is not None else None,
            confirmed_macros=confirmed_macros
        )
        db.add(db_meal)
        db.commit()
        db.refresh(db_meal)

        # Trigger dynamic score calculation in daily log
        try:
            from backend.app.repositories.daily_log_repository import DailyLogRepository
            daily_log_repo = DailyLogRepository()
            daily_log_repo.recalculate_and_save_score(db, athlete_id, db_meal.logged_at.date())
        except Exception as e:
            print(f"[MEAL REPO] Warning: Failed to recalculate score: {e}")

        return db_meal

    @staticmethod
    def create_vision_api_call(
        db: Session,
        athlete_id: UUID,
        api_provider: str,
        status: str,
        retry_count: int = 0,
        cost: float = 0.0
    ) -> VisionApiCalls:
        db_call = VisionApiCalls(
            athlete_id=athlete_id,
            api_provider=api_provider,
            status=status,
            retry_count=retry_count,
            cost=Decimal(str(cost))
        )
        db.add(db_call)
        db.commit()
        db.refresh(db_call)
        return db_call
