from sqlalchemy.orm import Session
from app.db.models.PredictionLog import PredictionLog
from datetime import datetime, timezone


def create_prediction(db: Session, grid_id: str, probability: float, risk_level: str,
                      run_timestamp: datetime | None = None):
    """
    Persist a single grid-cell prediction.
    Pass an explicit run_timestamp so that all cells in the same pipeline run
    share an identical timestamp — which is how get_latest_predictions groups them.
    """
    ts = run_timestamp or datetime.now(timezone.utc)
    db_prediction = PredictionLog(
        grid_id=grid_id,
        probability=probability,
        risk_level=risk_level,
        run_timestamp=ts,
    )
    db.add(db_prediction)
    return db_prediction          # caller must commit


def create_prediction_batch(db: Session, predictions: list[dict]):
    """
    Persist a batch of predictions sharing one run_timestamp, then commit once.
    Each dict should have: grid_id, probability, risk_level.
    Returns the shared run_timestamp used.
    """
    run_ts = datetime.now(timezone.utc)
    for pred in predictions:
        create_prediction(
            db,
            grid_id=pred["grid_id"],
            probability=pred["probability"],
            risk_level=pred["risk_level"],
            run_timestamp=run_ts,
        )
    db.commit()
    return run_ts


def get_latest_predictions(db: Session, limit: int = 100):
    """
    Returns all predictions from the single most-recent pipeline run,
    identified by the latest run_timestamp.
    """
    latest_run = (
        db.query(PredictionLog.run_timestamp)
        .order_by(PredictionLog.run_timestamp.desc())
        .first()
    )
    if not latest_run:
        return []

    return (
        db.query(PredictionLog)
        .filter(PredictionLog.run_timestamp == latest_run[0])
        .limit(limit)
        .all()
    )
