from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class AlertLog(Base):
    __tablename__ = "alert_logs"

    id = Column(Integer, primary_key=True, index=True)
    fired_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    risk_level = Column(String, nullable=False)
    channel = Column(String, nullable=False) # 'SMS' or 'WS'
    recipient = Column(String, nullable=True) # Phone number or 'broadcast'
