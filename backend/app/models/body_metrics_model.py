from sqlalchemy import Column, ForeignKey, Date, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID
import uuid
import datetime
from backend.app.config.database import Base

class BodyMetric(Base):
    __tablename__ = "body_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    athlete_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    log_date = Column(Date, nullable=False)
    weight = Column(Numeric, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
