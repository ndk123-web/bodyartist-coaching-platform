from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric, Boolean, Float
from sqlalchemy.orm import relationship
import uuid
import datetime
from backend.app.config.database import Base


class MealLog(Base):
    __tablename__ = "meal_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    athlete_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    logged_at = Column(DateTime(timezone=True), nullable=False, default=datetime.datetime.utcnow)
    photo_url = Column(String, nullable=True)  # Path inside Supabase Storage bucket
    food_name = Column(String(255), nullable=False)
    
    # Vision Pipeline Metadata
    raw_vision_response = Column(JSONB, nullable=True)
    confidence_score = Column(Numeric(3, 2), nullable=True)
    
    # API Estimates
    estimated_calories = Column(Numeric(6, 2), nullable=True)
    estimated_protein = Column(Numeric(5, 2), nullable=True)
    estimated_carbs = Column(Numeric(5, 2), nullable=True)
    estimated_fat = Column(Numeric(5, 2), nullable=True)
    estimated_micronutrients = Column(JSONB, nullable=False, default=dict)
    
    is_edited = Column(Boolean, nullable=False, default=False)

    serving_size = Column(Float, nullable=True)

    # not for v1

    # # Committed Values (Edited/Confirmed by Athlete)
    # edited_calories = Column(Numeric(6, 2), nullable=True)
    # edited_protein = Column(Numeric(5, 2), nullable=True)
    # edited_carbs = Column(Numeric(5, 2), nullable=True)
    # edited_fat = Column(Numeric(5, 2), nullable=True)
    # edited_micronutrients = Column(JSONB, nullable=True, default=dict)

    # Relationships
    athlete = relationship("User", backref="meal_logs")