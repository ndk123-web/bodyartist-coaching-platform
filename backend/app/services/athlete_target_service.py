from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException

from backend.app.repositories.diet_plan_repository import DietPlanRepository
from backend.app.schemas.athlete_target_schema import AthleteTargetResponse

class AthleteTargetService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = DietPlanRepository()

    def get_athlete_targets(self, athlete_id: UUID) -> AthleteTargetResponse:
        diet_plan = self.repository.get_by_athlete_id(self.db, athlete_id)
        
        if not diet_plan:
            data = {
                "athlete_id": athlete_id,
                "meals_target": 5,
                "water_target": 8,
                "steps_target": 10000,
                "cardio_target": 30,
                "tolerance_percent": 0,
                "target_macros": [
                    {"name": "Protein", "value": 200.0, "unit": "g"},
                    {"name": "Carbs", "value": 250.0, "unit": "g"},
                    {"name": "Fat", "value": 75.0, "unit": "g"}
                ],
                "supplement_checklist": [
                    {"name": "Creatine Monohydrate", "completed": False, "required": True},
                    {"name": "Omega 3 Fish Oil", "completed": False, "required": True},
                    {"name": "Multivitamin Formula", "completed": False, "required": True}
                ]
            }
            return AthleteTargetResponse.model_validate(data)
            
        # Safe normalization for target_macros format (dict vs list)
        db_macros = diet_plan.target_macros
        if isinstance(db_macros, dict):
            normalized_macros = [{"name": k.capitalize(), "value": v, "unit": "g"} for k, v in db_macros.items()]
        elif isinstance(db_macros, list):
            normalized_macros = db_macros
        else:
            normalized_macros = []
            
        data = {
            "athlete_id": diet_plan.athlete_id,
            "meals_target": diet_plan.meals_target or 5,
            "water_target": diet_plan.water_target or 8,
            "steps_target": diet_plan.steps_target or 10000,
            "cardio_target": diet_plan.cardio_target or 30,
            "tolerance_percent": diet_plan.tolerance_percent or 0,
            "target_macros": normalized_macros,
            "supplement_checklist": diet_plan.supplement_checklist or []
        }
        return AthleteTargetResponse.model_validate(data)


