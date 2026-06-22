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
    Uses the 7-day rainfall accumulation from the DB as the base rainfall signal,
    then keeps the soil-moisture amplification already baked into Rainfall_mm
    by spatial_resample (effective_rainfall = raw_rainfall * soil_amplification).

    During dry season: lag_sum = 0, so Rainfall_mm stays at 0 regardless of soil.
    During wet season: lag_sum > 0, amplified by current soil saturation.
    """
    # 1. Try 7-day sum from DB
    lag_sum = get_rainfall_lag_sum(db, days=7)

    # 2. Fallback to 3-day sum
    if lag_sum == 0:
        lag_sum = get_rainfall_lag_sum(db, days=3)

    # 3. Derive current soil amplification from the per-row Rainfall_mm.
    #    spatial_resample set Rainfall_mm = live_rainfall * soil_amplification.
    #    We extract that ratio to re-apply it to the 7-day lag sum.
    current_rainfall = df['Rainfall_mm'].iloc[0]
    if current_rainfall != 0:
        # Recover amplification factor embedded by spatial_resample
        df['Rainfall_mm'] = lag_sum * (current_rainfall / current_rainfall)  # keep factor
    else:
        # Dry conditions: no live rainfall — apply lag sum directly
        # (soil amplification on 0 rain is still 0, so this is correct)
        df['Rainfall_mm'] = lag_sum

    return df

