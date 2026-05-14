from sqlalchemy.orm import Session
from app.db.models.PredictionLog import PredictionLog
from datetime import datetime

def create_prediction(db: Session, grid_id: str, probability: float, risk_level: str):
    db_prediction = PredictionLog(
        grid_id=grid_id,
        probability=probability,
        risk_level=risk_level,
        run_timestamp=datetime.utcnow()
    )
    db.add(db_prediction)
    db.commit()
    db.refresh(db_prediction)
    return db_prediction

def get_latest_predictions(db: Session, limit: int = 100):
    # Get the latest run timestamp
    latest_run = db.query(PredictionLog.run_timestamp).order_by(PredictionLog.run_timestamp.desc()).first()
    if not latest_run:
        return []
    
    # Return all cells from that specific run
    return db.query(PredictionLog).filter(
        PredictionLog.run_timestamp == latest_run[0]
    ).limit(limit).all()
