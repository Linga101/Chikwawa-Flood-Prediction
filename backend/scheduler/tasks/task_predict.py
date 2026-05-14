from scheduler.celery_app import celery_app
from app.db.database import SessionLocal
from app.core.preprocessing.pipeline import run_preprocessing_pipeline
from app.core.prediction.predictor import predict
from app.core.prediction.risk_classifier import classify_risk
from app.db.crud.crud_predictions import create_prediction

@celery_app.task(name="scheduler.tasks.task_predict.run_prediction_cycle")
def run_prediction_cycle(raw_data: dict):
    """
    Runs the inference pipeline on the newly ingested data.
    """
    db = SessionLocal()
    try:
        # 1. Preprocess and normalize
        features_df = run_preprocessing_pipeline(raw_data, db)
        
        # 2. Run model inference
        # features_df contains one or more rows (grid cells)
        probabilities = predict(features_df)
        
        # 3. Classify and log results
        # Assuming for now we log for each cell in the dataframe
        for idx, prob in enumerate(probabilities):
            grid_id = features_df.index[idx]
            risk_level = classify_risk(prob)
            
            create_prediction(db, grid_id, float(prob), risk_level)
        
        # 4. Trigger alert orchestration (if needed)
        from app.core.alerting.threshold_monitor import check_and_trigger_alerts
        check_and_trigger_alerts(probabilities, features_df.index.tolist())
        
        return {"status": "success", "cells_processed": len(probabilities)}
        
    finally:
        db.close()
