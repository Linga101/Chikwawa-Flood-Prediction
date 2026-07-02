from app.db.models.SensorReading import SensorReading
from app.db.models.PredictionLog import PredictionLog
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

# Shire River thresholds (Chiromo gauge historical data)
SHIRE_RIVER_DANGER_THRESHOLD_M  = 6.0
SHIRE_RIVER_WARNING_THRESHOLD_M = 4.5
RIVER_BASELINE_M = 3.5  # Dry-season low for dynamic elevation_to_river adjustment

# ── LightGBM feature importance weights (derived from model gain scores) ─────
# Total gain: ~130,867. Each weight = gain / total * 100, rounded to sum = 100.
#   NDVI:                32,894  → 25%
#   Slope_deg:           28,735  → 22%
#   elevation_to_river:  14,182  → 11%
#   PS_codes:            13,127  → 10%
#   LC_codes:            13,003  → 10%
#   Dist_River_m:         9,951  →  8%
#   Elevation_m:          8,002  →  6%
#   Rainfall_mm:          7,859  →  6%
#   topographic_wet_idx:  3,114  →  2%
FACTOR_WEIGHTS_9 = {
    "ndvi":                    25,
    "slope":                   22,
    "elevation_to_river":      11,
    "soil_type":               10,
    "land_cover":              10,
    "dist_river":               8,
    "elevation":                6,
    "rainfall":                 6,
    "topographic_wet_index":    2,
}

# Static TA zone geographic profiles (mirrors spatial_resample.py)
TA_PROFILES = {
    "TA Ngabu":      {"elev": 45.0,  "slope": 0.8, "dist_river": 320.0,  "twi": 12.4, "elev_to_river": 1.2,  "lc": 12, "ps": 3},
    "TA Makhwira":   {"elev": 62.0,  "slope": 1.5, "dist_river": 850.0,  "twi": 10.1, "elev_to_river": 3.5,  "lc": 10, "ps": 2},
    "TA Lundu":      {"elev": 120.0, "slope": 3.2, "dist_river": 2400.0, "twi":  7.8, "elev_to_river": 8.0,  "lc": 50, "ps": 1},
    "TA Kasisi":     {"elev": 55.0,  "slope": 1.1, "dist_river": 620.0,  "twi": 11.2, "elev_to_river": 2.1,  "lc": 12, "ps": 3},
    "TA Chapananga": {"elev": 95.0,  "slope": 2.8, "dist_river": 1800.0, "twi":  9.2, "elev_to_river": 5.5,  "lc": 50, "ps": 1},
}


def _latest_sensor(db: Session, source: str, grid_id: str):
    """Return the most-recent SensorReading for (source, grid_id), or fallback to district-wide."""
    from sqlalchemy import or_
    return (
        db.query(SensorReading)
        .filter(
            SensorReading.source == source, 
            or_(SensorReading.grid_id == grid_id, SensorReading.grid_id.is_(None))
        )
        .order_by(SensorReading.timestamp.desc())
        .first()
    )


def _latest_sensor_any(db: Session, source: str):
    """Return the most-recent SensorReading for a source across all zones."""
    return (
        db.query(SensorReading)
        .filter(SensorReading.source == source)
        .order_by(SensorReading.timestamp.desc())
        .first()
    )


def compute_5_factor_assessment(db: Session, grid_id: str) -> dict:
    """
    Returns the full 9-factor risk breakdown for a TA zone.
    Factors match the exact features used by the LightGBM model.
    Weights are derived from model feature importance (gain scores).
    """

    # ── 1. ML probability is the single source of truth ─────────────────────
    latest_pred = (
        db.query(PredictionLog)
        .filter(PredictionLog.grid_id == grid_id)
        .order_by(PredictionLog.run_timestamp.desc())
        .first()
    )
    ml_probability  = latest_pred.probability if latest_pred else 0.0
    composite_score = round(ml_probability * 100, 1)

    profile = TA_PROFILES.get(grid_id, TA_PROFILES["TA Ngabu"])

    # ── 2. Live sensor values from DB ─────────────────────────────────────────
    rain_r      = _latest_sensor(db, "GPM",    grid_id)
    soil_r      = _latest_sensor(db, "SMAP",   grid_id)
    river_r     = _latest_sensor(db, "DAHITI", grid_id) or _latest_sensor_any(db, "DAHITI")
    ndvi_r      = _latest_sensor(db, "Sentinel-2",   grid_id)   # stored if available

    rainfall_mm     = rain_r.value  if rain_r  else 0.0
    soil_moisture   = soil_r.value  if soil_r  else 0.0
    river_level_m   = river_r.value if river_r else RIVER_BASELINE_M
    ndvi_val        = ndvi_r.value  if ndvi_r  else 0.5   # live or neutral fallback

    # River rise above dry-season baseline (same logic as spatial_resample.py)
    river_rise = max(0.0, river_level_m - RIVER_BASELINE_M)

    # ── 3. Compute per-factor 0-100 risk scores ──────────────────────────────

    # NDVI (25%) — lower NDVI → less vegetation → faster runoff → higher risk
    # NDVI range: -1 to 1. Healthy veg ~0.6, bare soil ~0.1, water negative.
    ndvi_score = round(max(0, min(100, (1.0 - ndvi_val) * 100)), 1)

    # Slope (22%) — steeper = faster runoff = higher flash-flood risk
    # Scale: 0° → 0, 10°+ → 100
    slope_score = round(min(profile["slope"] / 10.0, 1.0) * 100, 1)

    # Elevation-to-river (11%) — smaller gap = higher inundation risk
    # Dynamically adjusted by live river level rise
    dynamic_etr = max(0.0, profile["elev_to_river"] - river_rise)
    # Scale: 0m above water → 100, 20m above water → 0
    etr_score = round(max(0, 100 - (dynamic_etr / 20.0) * 100), 1)

    # Soil type / PS_codes (10%) — Vertisol (3) = clay = highest risk
    soil_type_scores = {3: 85, 2: 60, 1: 35}
    soil_type_score  = soil_type_scores.get(profile["ps"], 50)

    # Land cover / LC_codes (10%) — Cropland floodplain = highest, woodland = lower
    lc_scores = {12: 85, 10: 60, 50: 35}
    lc_score  = lc_scores.get(profile["lc"], 50)

    # Distance to river (8%) — closer = higher risk
    # Scale: 0m → 100, 5000m+ → 0
    dist_score = round(max(0, 100 - (profile["dist_river"] / 5000.0) * 100), 1)

    # Elevation (6%) — lower = higher floodplain risk
    # Scale: 0m asl → 100, 200m+ asl → 0
    elev_score = round(max(0, 100 - (profile["elev"] / 200.0) * 100), 1)

    # Rainfall / 7-day accumulation (6%) — 0mm → 0, 30mm+ → 100
    rainfall_score = round(min(rainfall_mm / 30.0, 1.0) * 100, 1)

    # Topographic Wetness Index (2%) — higher TWI = more water accumulation
    # TWI range typical: 2–18. Scale: 0 → 0, 18 → 100
    twi_score = round(min(profile["twi"] / 18.0, 1.0) * 100, 1)

    return {
        "grid_id":         grid_id,
        "composite_score": composite_score,
        "ml_probability":  round(ml_probability, 4),
        "factors": {
            "ndvi": {
                "label":   "Vegetation Cover (NDVI)",
                "weight":  FACTOR_WEIGHTS_9["ndvi"],
                "score":   ndvi_score,
                "note":    f"Sentinel-2 live NDVI: {ndvi_val:.3f} — lower vegetation = faster runoff",
                "source":  "GEE / Copernicus Sentinel-2",
                "is_live": True,
            },
            "slope": {
                "label":   "Terrain Slope",
                "weight":  FACTOR_WEIGHTS_9["slope"],
                "score":   slope_score,
                "note":    f"Mean slope: {profile['slope']}° — steeper terrain = faster flash-flood runoff",
                "source":  "SRTM DEM (static)",
                "is_live": False,
            },
            "elevation_to_river": {
                "label":           "Height Above River",
                "weight":          FACTOR_WEIGHTS_9["elevation_to_river"],
                "score":           etr_score,
                "note":            f"Effective gap above Shire River: {dynamic_etr:.2f}m (static {profile['elev_to_river']}m − {river_rise:.2f}m river rise)",
                "source":          "DAHITI v2 (live)",
                "current_m":       round(river_level_m, 2),
                "danger_threshold_m": SHIRE_RIVER_DANGER_THRESHOLD_M,
                "is_live":         True,
            },
            "soil_type": {
                "label":   "Soil Type (Permeability)",
                "weight":  FACTOR_WEIGHTS_9["soil_type"],
                "score":   soil_type_score,
                "note":    f"Soil class PS={profile['ps']}: {'Vertisol (high clay, low drainage)' if profile['ps'] == 3 else 'Luvisol (moderate)' if profile['ps'] == 2 else 'Cambisol (good drainage)'}",
                "source":  "FAO soil map (static)",
                "is_live": False,
            },
            "land_cover": {
                "label":   "Land Cover Type",
                "weight":  FACTOR_WEIGHTS_9["land_cover"],
                "score":   lc_score,
                "note":    f"LC class {profile['lc']}: {'Cropland / Floodplain' if profile['lc'] == 12 else 'Grassland / Savanna' if profile['lc'] == 10 else 'Woodland'}",
                "source":  "Copernicus LC (static)",
                "is_live": False,
            },
            "dist_river": {
                "label":   "Distance to Shire River",
                "weight":  FACTOR_WEIGHTS_9["dist_river"],
                "score":   dist_score,
                "note":    f"Mean distance: {profile['dist_river']:,.0f}m from Shire River channel",
                "source":  "OSM / SRTM (static)",
                "is_live": False,
            },
            "elevation": {
                "label":   "Zone Elevation (ASL)",
                "weight":  FACTOR_WEIGHTS_9["elevation"],
                "score":   elev_score,
                "note":    f"Mean elevation: {profile['elev']}m above sea level — lower = higher inundation exposure",
                "source":  "SRTM DEM (static)",
                "is_live": False,
            },
            "rainfall": {
                "label":   "7-Day Rainfall Accumulation",
                "weight":  FACTOR_WEIGHTS_9["rainfall"],
                "score":   rainfall_score,
                "note":    f"Latest GPM reading: {rainfall_mm:.2f} mm (danger threshold: 30mm+)",
                "source":  "GEE / NASA GPM (live)",
                "is_live": True,
            },
            "topographic_wet_index": {
                "label":   "Topographic Wetness Index",
                "weight":  FACTOR_WEIGHTS_9["topographic_wet_index"],
                "score":   twi_score,
                "note":    f"TWI: {profile['twi']} — higher = water accumulates more in this zone",
                "source":  "SRTM DEM derived (static)",
                "is_live": False,
            },
        },
    }



def get_rainfall_trends(db: Session, window_days: int = 7) -> list:
    """
    Returns daily aggregated rainfall totals for the chart widget.
    Uses all GPM readings across all zones to get district-level picture.
    """
    start_date = datetime.now(timezone.utc) - timedelta(days=window_days)
    readings = (
        db.query(SensorReading)
        .filter(SensorReading.source == "GPM", SensorReading.timestamp >= start_date)
        .order_by(SensorReading.timestamp.asc())
        .all()
    )

    daily: dict = {}
    for r in readings:
        day_key = r.timestamp.strftime("%Y-%m-%d")
        daily.setdefault(day_key, []).append(r.value)

    return [
        {
            "date":        day,
            "rainfall_mm": round(sum(vals) / len(vals), 2),
            "peak_mm":     round(max(vals), 2),
        }
        for day, vals in daily.items()
    ]


def get_river_level_status(db: Session) -> dict:
    """
    Returns the latest Shire River height with danger context.
    """
    latest    = _latest_sensor_any(db, "DAHITI")
    current_m = latest.value if latest else 0.0

    pct_of_danger = min(round((current_m / SHIRE_RIVER_DANGER_THRESHOLD_M) * 100, 1), 100)
    if current_m >= SHIRE_RIVER_DANGER_THRESHOLD_M:
        status = "DANGER"
    elif current_m >= SHIRE_RIVER_WARNING_THRESHOLD_M:
        status = "WARNING"
    else:
        status = "SAFE"

    return {
        "river_name":          "Shire River (Chiromo Gauge)",
        "current_level_m":     round(current_m, 2),
        "warning_threshold_m": SHIRE_RIVER_WARNING_THRESHOLD_M,
        "danger_threshold_m":  SHIRE_RIVER_DANGER_THRESHOLD_M,
        "percent_of_danger":   pct_of_danger,
        "status":              status,
        "last_updated":        latest.timestamp.isoformat() if latest else None,
    }
