from scheduler.celery_app import celery_app
from app.db.database import SessionLocal
from app.core.preprocessing.pipeline import run_preprocessing_pipeline
from app.core.prediction.predictor import predict
from app.core.prediction.risk_classifier import classify_risk
from app.db.crud.crud_predictions import create_prediction_batch

@celery_app.task(name="scheduler.tasks.task_predict.run_prediction_cycle")
def run_prediction_cycle(raw_data: dict):
    """
    Runs the inference pipeline on newly ingested data for all TA zones.
    All predictions share one run_timestamp so get_latest_predictions returns all 5 zones.
    """
    db = SessionLocal()
    try:
        # 1. Preprocess and normalize — now returns 5 rows (one per TA zone)
        features_df = run_preprocessing_pipeline(raw_data, db)

        # 2. Run LightGBM inference
        probabilities = predict(features_df)

        # 3. Build batch and commit with a single shared run_timestamp
        batch = []
        for idx, prob in enumerate(probabilities):
            grid_id    = features_df.index[idx]
            risk_level = classify_risk(float(prob))
            batch.append({
                "grid_id":     grid_id,
                "probability": float(prob),
                "risk_level":  risk_level,
            })

        create_prediction_batch(db, batch)

        # 4. Trigger alert orchestration
        from app.core.alerting.threshold_monitor import check_and_trigger_alerts
        check_and_trigger_alerts(probabilities, features_df.index.tolist())

        return {"status": "success", "cells_processed": len(batch)}

    finally:
        db.close()
