from sqlalchemy import Column, Integer, Float, String, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, index=True)
    run_timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    grid_id = Column(String, index=True) # ID of the specific 1km grid cell
    probability = Column(Float, nullable=False) # e.g., 0.91
    risk_level = Column(String, nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
