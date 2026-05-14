from scheduler.celery_app import celery_app
from app.db.database import SessionLocal
from app.db.models.SensorReading import SensorReading
from datetime import datetime, timedelta

@celery_app.task(name="scheduler.tasks.task_cleanup.run_cleanup")
def run_cleanup():
    """
    Deletes or archives sensor data older than 30 days to keep the DB fast.
    """
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(days=30)
        
        # Simple delete for now
        num_deleted = db.query(SensorReading).filter(
            SensorReading.timestamp < cutoff
        ).delete()
        
        db.commit()
        return {"status": "success", "deleted_count": num_deleted}
    finally:
        db.close()
