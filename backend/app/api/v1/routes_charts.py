from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.dependencies import get_db
from app.core.analytics import get_rainfall_trends, get_river_level_status
from app.db.models.HistoricalEvent import HistoricalEvent

router = APIRouter()

# Schemas for Historical Events
class HistoricalEventBase(BaseModel):
    year: str
    event_name: str
    impact_level: str
    people_affected: int
    economic_loss: str

class HistoricalEventCreate(HistoricalEventBase):
    pass

class HistoricalEventResponse(HistoricalEventBase):
    id: int
    class Config:
        from_attributes = True

@router.get("/rainfall-trends")
async def read_rainfall_trends(
    window: int = Query(default=7, ge=1, le=30, description="Number of days to look back (1-30)"),
    db: Session = Depends(get_db)
):
    """
    Returns daily aggregated rainfall data for the chart widget.
    Supports ?window=7 (default) or ?window=30 for the 30-day view.
    """
    return get_rainfall_trends(db, window_days=window)


@router.get("/river-levels")
async def read_river_levels(db: Session = Depends(get_db)):
    """
    Returns the latest Shire River level at Chiromo gauge vs. danger thresholds.
    Powers the 'Water Levels' widget in the Readdy-style dashboard.
    """
    return get_river_level_status(db)

@router.get("/historical-events", response_model=List[HistoricalEventResponse])
async def get_historical_events(db: Session = Depends(get_db)):
    """
    Returns all historical flood events.
    """
    events = db.query(HistoricalEvent).order_by(HistoricalEvent.year.desc()).all()
    return events

@router.post("/historical-events", response_model=HistoricalEventResponse)
async def create_historical_event(event: HistoricalEventCreate, db: Session = Depends(get_db)):
    """
    Creates a new historical flood event record.
    """
    db_event = HistoricalEvent(**event.dict())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

