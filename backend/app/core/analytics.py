from app.db.models.SensorReading import SensorReading
from app.db.models.PredictionLog import PredictionLog
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

# Shire River danger threshold in metres (based on Chiromo gauge historical data)
SHIRE_RIVER_DANGER_THRESHOLD_M = 6.0
SHIRE_RIVER_WARNING_THRESHOLD_M = 4.5

def compute_5_factor_assessment(db: Session, grid_id: str) -> dict:
    """
    Derives the Readdy-style 5-factor weighted risk breakdown for a grid cell.
    Weights: Rainfall 30%, Soil 25%, River Proximity 20%, Infrastructure 15%, Elevation 10%.
    Each factor is expressed as a normalized 0-100 score.
    """
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    # --- Factor 1: Rainfall Intensity (30%) ---
    rain_readings = db.query(SensorReading).filter(
        SensorReading.source == "GPM",
        SensorReading.timestamp >= week_ago
    ).all()
    avg_rainfall_mm = sum(r.value for r in rain_readings) / max(len(rain_readings), 1)
    # Normalize: 0mm = 0, 100mm+ = 100
    rainfall_score = min(avg_rainfall_mm / 100.0, 1.0) * 100

    # --- Factor 2: Soil Saturation (25%) ---
    soil_readings = db.query(SensorReading).filter(
        SensorReading.source == "SMAP",
        SensorReading.timestamp >= week_ago
    ).all()
    avg_soil = sum(r.value for r in soil_readings) / max(len(soil_readings), 1)
    # SMAP values are 0.0-1.0 (volumetric water content)
    soil_score = min(avg_soil, 1.0) * 100

    # --- Factor 3: River Proximity / Shire River Level (20%) ---
    river_readings = db.query(SensorReading).filter(
        SensorReading.source == "DAHITI",
        SensorReading.timestamp >= week_ago
    ).order_by(SensorReading.timestamp.desc()).first()
    current_level_m = river_readings.value if river_readings else 0.0
    river_score = min(current_level_m / SHIRE_RIVER_DANGER_THRESHOLD_M, 1.0) * 100

    # --- Factor 4: Infrastructure/Land Cover (15%) ---
    # Heuristic: derived from the latest prediction probability for the grid
    latest_prediction = db.query(PredictionLog).filter(
        PredictionLog.grid_id == grid_id
    ).order_by(PredictionLog.timestamp.desc()).first()
    infra_score = (latest_prediction.probability * 100) if latest_prediction else 0.0

    # --- Factor 5: Elevation/Slope (10%) ---
    # Heuristic: inverse of the prediction probability (low elevation = higher risk)
    elevation_score = max(0, 100 - infra_score)

    # --- Weighted Composite ---
    composite = (
        rainfall_score  * 0.30 +
        soil_score      * 0.25 +
        river_score     * 0.20 +
        infra_score     * 0.15 +
        elevation_score * 0.10
    )

    return {
        "grid_id": grid_id,
        "composite_score": round(composite, 1),
        "factors": {
            "rainfall_intensity":  {"weight": 30, "score": round(rainfall_score, 1)},
            "soil_saturation":     {"weight": 25, "score": round(soil_score, 1)},
            "river_level":         {"weight": 20, "score": round(river_score, 1),
                                    "current_m": round(current_level_m, 2),
                                    "danger_threshold_m": SHIRE_RIVER_DANGER_THRESHOLD_M},
            "infrastructure_risk": {"weight": 15, "score": round(infra_score, 1)},
            "elevation_slope":     {"weight": 10, "score": round(elevation_score, 1)},
        }
    }


def get_rainfall_trends(db: Session, window_days: int = 7) -> list:
    """
    Returns daily aggregated rainfall totals for the chart widget.
    window_days: 7 or 30
    """
    start_date = datetime.utcnow() - timedelta(days=window_days)
    readings = db.query(SensorReading).filter(
        SensorReading.source == "GPM",
        SensorReading.timestamp >= start_date
    ).order_by(SensorReading.timestamp.asc()).all()

    # Aggregate into daily buckets
    daily = {}
    for r in readings:
        day_key = r.timestamp.strftime("%Y-%m-%d")
        if day_key not in daily:
            daily[day_key] = []
        daily[day_key].append(r.value)

    return [
        {"date": day, "rainfall_mm": round(sum(vals) / len(vals), 2), "peak_mm": round(max(vals), 2)}
        for day, vals in daily.items()
    ]


def get_river_level_status(db: Session) -> dict:
    """
    Returns the latest Shire River height with danger context for the Water Levels widget.
    """
    latest = db.query(SensorReading).filter(
        SensorReading.source == "DAHITI"
    ).order_by(SensorReading.timestamp.desc()).first()

    current_m = latest.value if latest else 0.0
    pct_of_danger = min(round((current_m / SHIRE_RIVER_DANGER_THRESHOLD_M) * 100, 1), 100)
    status = "SAFE"
    if current_m >= SHIRE_RIVER_DANGER_THRESHOLD_M:
        status = "DANGER"
    elif current_m >= SHIRE_RIVER_WARNING_THRESHOLD_M:
        status = "WARNING"

    return {
        "river_name": "Shire River (Chiromo Gauge)",
        "current_level_m": round(current_m, 2),
        "warning_threshold_m": SHIRE_RIVER_WARNING_THRESHOLD_M,
        "danger_threshold_m": SHIRE_RIVER_DANGER_THRESHOLD_M,
        "percent_of_danger": pct_of_danger,
        "status": status,
        "last_updated": latest.timestamp.isoformat() if latest else None,
    }
