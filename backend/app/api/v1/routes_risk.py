from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.dependencies import get_db
from app.db.crud.crud_predictions import get_latest_predictions
from app.db.crud.crud_alerts import get_alert_history
from app.schemas.risk_schema import RiskResponse
from app.core.analytics import compute_5_factor_assessment

router = APIRouter()

@router.get("/latest-risk")
async def read_latest_risk(db: Session = Depends(get_db)):
    """
    Returns the results of the most recent flood prediction run across all grid cells.
    Powers the Risk Zones Overview on the main dashboard.
    Returns a list of {grid_id, probability, risk_level} objects.
    """
    predictions = get_latest_predictions(db)
    return [
        {
            "id": p.id,
            "grid_id": p.grid_id,
            "probability": p.probability,
            "risk_level": p.risk_level,
            "run_timestamp": p.run_timestamp.isoformat() if p.run_timestamp else None,
        }
        for p in predictions
    ]


@router.get("/activity-feed")
async def read_activity_feed(db: Session = Depends(get_db), limit: int = 10):
    """
    Public endpoint — returns recent alert log entries for the dashboard
    Live Activity Feed widget. No authentication required.
    """
    alerts = get_alert_history(db, limit=limit)
    return [
        {
            "id":         a.id,
            "risk_level": a.risk_level,
            "channel":    a.channel,
            "recipient":  a.recipient or "Broadcast",
            "ta_area":    a.ta_area or a.recipient or "Unknown zone",
            "message":    a.message or "Alert dispatched",
            "fired_at":   a.fired_at.isoformat() if a.fired_at else None,
        }
        for a in alerts
    ]


@router.get("/{grid_id}/assessment")
async def read_risk_assessment(grid_id: str, db: Session = Depends(get_db)):
    """
    Returns the 5-factor weighted risk breakdown for a specific TA zone.
    Composite score is pulled directly from the LightGBM prediction log.
    Factors: Elevation/Slope (28%), Soil (23%), River (22%), Rainfall (13%), Infrastructure (13%).
    """
    result = compute_5_factor_assessment(db, grid_id)
    return result
