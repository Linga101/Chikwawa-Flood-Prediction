from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.dependencies import get_db
from app.db.crud.crud_predictions import get_latest_predictions
from app.schemas.risk_schema import RiskResponse
from app.core.analytics import compute_5_factor_assessment

router = APIRouter()

@router.get("/latest-risk", response_model=List[RiskResponse])
async def read_latest_risk(db: Session = Depends(get_db)):
    """
    Returns the results of the most recent flood prediction run across all grid cells.
    Powers the Risk Zones Overview on the main dashboard.
    """
    return get_latest_predictions(db)


@router.get("/{grid_id}/assessment")
async def read_risk_assessment(grid_id: str, db: Session = Depends(get_db)):
    """
    Returns the Readdy-style 5-factor weighted risk breakdown for a specific grid cell.
    Factors: Rainfall (30%), Soil Saturation (25%), River Level (20%),
             Infrastructure (15%), Elevation (10%).
    """
    result = compute_5_factor_assessment(db, grid_id)
    if result["composite_score"] == 0 and not result["factors"]["rainfall_intensity"]["score"]:
        raise HTTPException(status_code=404, detail=f"No assessment data found for grid '{grid_id}'.")
    return result
