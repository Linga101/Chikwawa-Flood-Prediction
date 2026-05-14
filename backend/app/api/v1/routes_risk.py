from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.dependencies import get_db
from app.db.crud.crud_predictions import get_latest_predictions
from app.schemas.risk_schema import RiskResponse

router = APIRouter()

@router.get("/latest-risk", response_model=List[RiskResponse])
async def read_latest_risk(db: Session = Depends(get_db)):
    """
    Returns the results of the most recent flood prediction run.
    """
    return get_latest_predictions(db)
