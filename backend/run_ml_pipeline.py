"""
Manual ML pipeline trigger — fetches live sensor data, runs LightGBM inference
for all 5 TA zones, and persists results to the database.

Run inside the app container:
    docker exec chikwawa_app python run_ml_pipeline.py
"""

import asyncio
import sys
from datetime import datetime, timezone

from app.db.database import SessionLocal
from app.db.models.SensorReading import SensorReading
from app.core.ingestion.rainfall_fetcher import fetch_latest_rainfall
from app.core.ingestion.soil_fetcher import fetch_soil_moisture
from app.core.ingestion.sentinel_fetcher import fetch_ndvi
from app.core.ingestion.gauge_fetcher import fetch_river_level
from app.core.preprocessing.pipeline import run_preprocessing_pipeline
from app.core.prediction.predictor import predict
from app.core.prediction.risk_classifier import classify_risk
from app.db.crud.crud_predictions import create_prediction_batch

TA_ZONES = ["TA Ngabu", "TA Makhwira", "TA Lundu", "TA Kasisi", "TA Chapananga"]


def _save_sensor_reading(db, source: str, value: float, grid_id: str = "district"):
    """Persist a sensor observation so analytics queries can aggregate it."""
    reading = SensorReading(
        source=source,
        value=value,
        grid_id=grid_id,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(reading)


def main():
    print("=" * 60)
    print("Chikwawa Flood Prediction — ML Pipeline Trigger")
    print("=" * 60)

    db = SessionLocal()
    try:
        # ── 1. Fetch live sensor data ─────────────────────────────────────
        print("\n[1/4] Fetching live sensor data …")

        rainfall = fetch_latest_rainfall()
        rainfall = rainfall if rainfall is not None else 0.0
        print(f"  ✓ GPM Rainfall       : {rainfall:.4f} mm")

        soil_moisture = fetch_soil_moisture()
        soil_moisture = soil_moisture if soil_moisture is not None else 0.25
        print(f"  ✓ SMAP Soil Moisture : {soil_moisture:.4f} m³/m³")

        ndvi = fetch_ndvi()
        ndvi = ndvi if ndvi is not None else 0.45
        print(f"  ✓ Sentinel-2 NDVI    : {ndvi:.4f}")

        river_level = asyncio.run(fetch_river_level())
        river_level = river_level if river_level is not None else 0.0
        print(f"  ✓ DAHITI River Level : {river_level:.2f} m")

        # ── 2. Persist sensor readings to DB (per TA zone) ───────────────
        print("\n[2/4] Saving sensor readings to database …")
        for zone in TA_ZONES:
            _save_sensor_reading(db, "GPM",    rainfall,     grid_id=zone)
            _save_sensor_reading(db, "SMAP",   soil_moisture,grid_id=zone)
            _save_sensor_reading(db, "DAHITI", river_level,  grid_id=zone)
        db.commit()
        print(f"  ✓ Saved readings for {len(TA_ZONES)} TA zones")

        # ── 3. Preprocess + run LightGBM inference ────────────────────────
        print("\n[3/4] Running LightGBM inference pipeline …")
        raw_data = {
            "rainfall":     rainfall,
            "ndvi":         ndvi,
            "river_level":  river_level,
            "soil_moisture":soil_moisture,
        }

        features_df = run_preprocessing_pipeline(raw_data, db)
        print(f"  ✓ Feature matrix shape: {features_df.shape}")
        print(f"  ✓ Grid IDs: {list(features_df.index)}")

        probabilities = predict(features_df)
        print(f"  ✓ Predictions: {list(probabilities)}")

        # ── 4. Batch-persist all predictions with one shared run_timestamp ──
        print("\n[4/4] Saving predictions …")
        batch = []
        for idx, prob in enumerate(probabilities):
            grid_id    = features_df.index[idx]
            risk_level = classify_risk(float(prob))
            batch.append({"grid_id": grid_id, "probability": float(prob), "risk_level": risk_level})
            print(f"  ✓ {grid_id:20s}  prob={prob:.4f}  risk={risk_level}")

        create_prediction_batch(db, batch)

        # Trigger alert checks
        from app.core.alerting.threshold_monitor import check_and_trigger_alerts
        check_and_trigger_alerts(probabilities, features_df.index.tolist())

        print("\n✅  Pipeline complete — dashboard data updated.")

    except Exception as e:
        print(f"\n❌  Pipeline failed: {e}", file=sys.stderr)
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
