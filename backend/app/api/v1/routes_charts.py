from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.dependencies import get_db
from app.db.crud.crud_sensors import get_latest_readings_by_source
from app.schemas.sensor_schema import SensorReadingResponse

router = APIRouter()

@router.get("/rainfall-trends", response_model=List[SensorReadingResponse])
async def read_rainfall_trends(db: Session = Depends(get_db)):
    """
    Returns the past 7 days of rainfall readings for time-series charts.
    """
    return get_latest_readings_by_source(db, "GPM")

@router.get("/river-levels", response_model=List[SensorReadingResponse])
async def read_river_levels(db: Session = Depends(get_db)):
    """
    Returns the past 7 days of Shire River gauge readings.
    """
    return get_latest_readings_by_source(db, "DAHITI")
