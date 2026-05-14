import asyncio
from scheduler.celery_app import celery_app
from app.db.database import SessionLocal
from app.db.crud.crud_sensors import create_sensor_reading
from app.core.ingestion.rainfall_fetcher import fetch_latest_rainfall
from app.core.ingestion.soil_fetcher import fetch_soil_moisture
from app.core.ingestion.sentinel_fetcher import fetch_ndvi
from app.core.ingestion.gauge_fetcher import fetch_river_level

@celery_app.task(name="scheduler.tasks.task_ingest.run_ingestion_cycle", bind=True, max_retries=3)
def run_ingestion_cycle(self):
    """
    Periodic task that fetches data from all sources and triggers prediction.
    """
    db = SessionLocal()
    try:
        # 1. Fetch data from external APIs
        rainfall = fetch_latest_rainfall()
        soil_moisture = fetch_soil_moisture()
        ndvi = fetch_ndvi()
        
        # Async call for river level
        river_level = asyncio.run(fetch_river_level())
        
        # 2. Save to database
        create_sensor_reading(db, "GPM", rainfall)
        create_sensor_reading(db, "SMAP", soil_moisture)
        create_sensor_reading(db, "Sentinel-2", ndvi)
        create_sensor_reading(db, "DAHITI", river_level)
        
        # 3. Trigger prediction cycle (chaining)
        from scheduler.tasks.task_predict import run_prediction_cycle
        run_prediction_cycle.delay({
            'rainfall': rainfall,
            'soil_moisture': soil_moisture,
            'ndvi': ndvi,
            'river_level': river_level
        })
        
        return {"status": "success", "readings": [rainfall, soil_moisture, ndvi, river_level]}
        
    except Exception as exc:
        # Exponential backoff retry
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
    finally:
        db.close()
