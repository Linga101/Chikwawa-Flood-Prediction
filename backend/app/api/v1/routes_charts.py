from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from app.dependencies import get_db
from app.core.analytics import get_rainfall_trends, get_river_level_status

router = APIRouter()

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
