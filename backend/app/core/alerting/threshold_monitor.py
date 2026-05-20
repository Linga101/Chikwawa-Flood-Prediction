import asyncio
from app.db.database import SessionLocal
from app.config import settings
from app.core.alerting.sms_gateway import send_sms_alert
from app.core.alerting.websocket_notifier import manager
from app.db.models.Subscriber import Subscriber
from app.db.crud.crud_alerts import create_alert_log
from app.core.prediction.risk_classifier import classify_risk, get_color_code, get_alert_message

# Traditional Authority zones used for location-aware messaging
TA_ZONES = ["TA Ngabu", "TA Makhwira", "TA Lundu", "TA Kasisi", "TA Chapananga"]

def check_and_trigger_alerts(probabilities: list, grid_ids: list):
    """
    Evaluates every grid cell prediction and:
    1. Broadcasts a tailored risk alert for EVERY cell to the WebSocket dashboard
       (LOW, MEDIUM, and HIGH all generate distinct messages).
    2. Sends SMS alerts to registered subscribers only when risk is HIGH.
    """
    if not probabilities:
        return

    max_prob = max(probabilities)
    max_idx  = probabilities.index(max_prob)
    grid_id  = grid_ids[max_idx] if grid_ids else "unknown"

    # --- Resolve the TA zone name from grid index for human-readable messages ---
    ta_location = TA_ZONES[max_idx % len(TA_ZONES)]
    risk_level  = classify_risk(max_prob)
    color       = get_color_code(risk_level)
    message     = get_alert_message(risk_level, location=ta_location, probability=max_prob)

    # --- 1. ALWAYS broadcast to the WebSocket dashboard (all three risk tiers) ---
    asyncio.run(manager.broadcast_alert({
        "type":        "RISK_UPDATE",
        "risk_level":  risk_level,
        "color":       color,
        "probability": round(float(max_prob), 4),
        "grid_id":     grid_id,
        "location":    ta_location,
        "message":     message,
    }))

    # --- 2. Send SMS ONLY for HIGH risk ---
    if risk_level == "HIGH":
        db = SessionLocal()
        try:
            subscribers = db.query(Subscriber).filter(Subscriber.is_active == True).all()
            sms_body = (
                f"CHIKWAWA FLOOD ALERT: {ta_location} is at HIGH flood risk "
                f"({int(max_prob * 100)}%). Please follow official evacuation instructions."
            )
            for sub in subscribers:
                asyncio.run(send_sms_alert(sub.phone_number, sms_body))
                create_alert_log(db, "HIGH", "SMS", sub.phone_number)
        finally:
            db.close()
