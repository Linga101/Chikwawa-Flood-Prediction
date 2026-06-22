from sqlalchemy.orm import Session
from app.db.models.AlertLog import AlertLog
from datetime import datetime

def create_alert_log(
    db: Session,
    risk_level: str,
    channel: str,
    recipient: str = None,
    message: str = None,
    ta_area: str = None,
):
    db_alert = AlertLog(
        fired_at=datetime.utcnow(),
        risk_level=risk_level,
        channel=channel,
        recipient=recipient,
        message=message,
        ta_area=ta_area,
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

def get_alert_history(db: Session, limit: int = 50):
    return db.query(AlertLog).order_by(AlertLog.fired_at.desc()).limit(limit).all()

def delete_alert(db: Session, alert_id: int):
    alert = db.query(AlertLog).filter(AlertLog.id == alert_id).first()
    if alert:
        db.delete(alert)
        db.commit()
        return True
    return False
