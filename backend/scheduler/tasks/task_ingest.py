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
        # river_level is a float (single point gauge)
        create_sensor_reading(db, "DAHITI", river_level)
        
        # Helper to insert either a dict of per-TA values or a fallback float
        def save_sensor_data(source_name: str, data):
            if isinstance(data, dict):
                for ta_name, val in data.items():
                    create_sensor_reading(db, source_name, val, grid_id=ta_name)
            else:
                create_sensor_reading(db, source_name, data or 0.0)
                
        save_sensor_data("GPM", rainfall)
        save_sensor_data("SMAP", soil_moisture)
        save_sensor_data("Sentinel-2", ndvi)
        
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
