from sqlalchemy import Column, Integer, String, Float
from app.db.database import Base

class HistoricalEvent(Base):
    __tablename__ = "historical_events"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(String(4), index=True)
    event_name = Column(String(100))
    impact_level = Column(String(20)) # High, Medium, Low
    people_affected = Column(Integer)
    economic_loss = Column(String(50)) # e.g., "$2.4M"
