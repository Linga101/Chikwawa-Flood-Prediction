from sqlalchemy.orm import Session
from app.db.models.SensorReading import SensorReading
from datetime import datetime

def create_sensor_reading(db: Session, source: str, value: float, geometry=None):
    db_reading = SensorReading(
        source=source,
        value=value,
        timestamp=datetime.utcnow(),
        geometry=geometry
    )
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    return db_reading

def get_latest_readings_by_source(db: Session, source: str, limit: int = 28): # 28 readings = 7 days if 6h interval
    return db.query(SensorReading).filter(
        SensorReading.source == source
    ).order_by(SensorReading.timestamp.desc()).limit(limit).all()
