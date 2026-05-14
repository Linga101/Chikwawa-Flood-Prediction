import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models.SensorReading import SensorReading
from datetime import datetime, timedelta

def get_rainfall_lag_sum(db: Session, days: int = 7) -> float:
    """
    Computes the sum of rainfall for the last 'days' from the database.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    result = db.query(func.sum(SensorReading.value)).filter(
        SensorReading.source == 'GPM',
        SensorReading.timestamp >= cutoff
    ).scalar()
    
    return result if result is not None else 0.0

def apply_path_a_logic(df: pd.DataFrame, db: Session) -> pd.DataFrame:
    """
    Path A Strategy:
    Replaces the current 'Rainfall_mm' with the 7-day (or 3-day fallback) sum.
    """
    # 1. Try 7-day sum
    lag_sum = get_rainfall_lag_sum(db, days=7)
    
    # 2. Check if we have enough history (simplified check: if sum is 0, try 3-day)
    # In a real scenario, we might count the records instead.
    if lag_sum == 0:
        lag_sum = get_rainfall_lag_sum(db, days=3)
    
    # 3. Replace the value in the DataFrame
    # All rows in the current inference batch get this context
    df['Rainfall_mm'] = lag_sum
    
    return df
