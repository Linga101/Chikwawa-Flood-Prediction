import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models.SensorReading import SensorReading
from datetime import datetime, timedelta


def get_rainfall_lag_sum(db: Session, days: int = 7) -> float:
    """
    Computes the sum of GPM rainfall for the last 'days' from the database.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)

    result = db.query(func.sum(SensorReading.value)).filter(
        SensorReading.source == 'GPM',
        SensorReading.timestamp >= cutoff
    ).scalar()

    return float(result) if result is not None else 0.0


def apply_path_a_logic(df: pd.DataFrame, db: Session, raw_data: dict = None) -> pd.DataFrame:
    """
    Path A Strategy:
    Replaces the per-row Rainfall_mm with the 7-day accumulated rainfall sum
    from the database, then applies the soil-moisture amplification factor
    derived from the live SMAP reading.

    Formula:
        Rainfall_mm = lag_7day_sum * soil_amplification
        soil_amplification = 1.0 + (live_soil_moisture * 2.0)

    Rationale:
        - Saturated soil reduces infiltration, converting more rainfall into
          surface runoff. A soil amplification factor of 2.0 (fully saturated)
          doubles the effective rainfall signal presented to the model.
        - During dry season: lag_sum is 0, so Rainfall_mm stays 0 regardless
          of soil moisture — which is physically correct.
        - During wet season: lag_sum > 0 and is amplified by saturation level.

    Args:
        df:       Feature DataFrame produced by spatial_resample.
        db:       Active SQLAlchemy session for reading sensor_readings.
        raw_data: Raw sensor dict from the ingestion step. Must contain
                  'soil_moisture' (m³/m³) to compute amplification correctly.
                  Defaults to no amplification (factor = 1.0) if omitted.
    """
    # 1. Try 7-day accumulated rainfall sum from DB
    lag_sum = get_rainfall_lag_sum(db, days=7)

    # 2. Fallback to 3-day sum if no 7-day data exists
    if lag_sum == 0.0:
        lag_sum = get_rainfall_lag_sum(db, days=3)

    # 3. Compute soil moisture amplification from the live SMAP reading.
    #    Formula mirrors spatial_resample.py: factor = 1.0 + (soil * 2.0)
    #    Range: 1.0 (completely dry soil) → ~2.0 (fully saturated soil)
    live_soil = (raw_data or {}).get("soil_moisture", 0.0) or 0.0
    soil_amplification = 1.0 + (live_soil * 2.0)

    # 4. Apply amplified lag sum across all TA zone rows
    df['Rainfall_mm'] = lag_sum * soil_amplification

    return df
