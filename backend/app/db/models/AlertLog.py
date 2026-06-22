from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.db.database import Base

class AlertLog(Base):
    __tablename__ = "alert_logs"

    id         = Column(Integer, primary_key=True, index=True)
    fired_at   = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    risk_level = Column(String, nullable=False)
    channel    = Column(String, nullable=False)   # 'SMS' | 'WS'
    recipient  = Column(String, nullable=True)     # Phone number or 'broadcast'
    message    = Column(Text,   nullable=True)     # Full alert message text
    ta_area    = Column(String, nullable=True)     # Target TA zone
