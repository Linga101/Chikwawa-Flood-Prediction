from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "chikwawa_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "scheduler.tasks.task_ingest",
        "scheduler.tasks.task_predict",
        "scheduler.tasks.task_cleanup"
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Automatic task discovery removed in favor of explicit include
# celery_app.autodiscover_tasks(["scheduler"])

# Schedule the 6-hour ingestion and prediction cycle
celery_app.conf.beat_schedule = {
    "ingest-predict-cycle-6h": {
        "task": "scheduler.tasks.task_ingest.run_ingestion_cycle",
        "schedule": crontab(minute=0, hour="*/6"), # Every 6 hours
    },
    "weekly-cleanup": {
        "task": "scheduler.tasks.task_cleanup.run_cleanup",
        "schedule": crontab(day_of_week=0, hour=0, minute=0), # Sunday midnight
    }
}
