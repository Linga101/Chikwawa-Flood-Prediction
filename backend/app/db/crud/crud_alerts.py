from sqlalchemy.orm import Session
from app.db.models.AlertLog import AlertLog
from datetime import datetime

def create_alert_log(db: Session, risk_level: str, channel: str, recipient: str = None):
    db_alert = AlertLog(
        fired_at=datetime.utcnow(),
        risk_level=risk_level,
        channel=channel,
        recipient=recipient
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

def get_alert_history(db: Session, limit: int = 50):
    return db.query(AlertLog).order_by(AlertLog.fired_at.desc()).limit(limit).all()
