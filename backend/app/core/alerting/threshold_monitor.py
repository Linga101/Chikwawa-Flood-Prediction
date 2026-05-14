import asyncio
from app.db.database import SessionLocal
from app.config import settings
from app.core.alerting.sms_gateway import send_sms_alert
from app.core.alerting.websocket_notifier import manager
from app.db.models.Subscriber import Subscriber
from app.db.crud.crud_alerts import create_alert_log

def check_and_trigger_alerts(probabilities, grid_ids):
    """
    Checks if any grid cell exceeds the threshold and dispatches alerts.
    """
    threshold = settings.ALERT_THRESHOLD
    max_prob = max(probabilities) if any(probabilities) else 0.0
    
    # 1. Broadcast to WebSocket (always send current status to dashboard)
    asyncio.run(manager.broadcast_alert({
        "type": "RISK_UPDATE",
        "max_probability": float(max_prob),
        "status": "CRITICAL" if max_prob >= threshold else "NORMAL"
    }))
    
    # 2. Check for critical threshold to trigger SMS
    if max_prob >= threshold:
        db = SessionLocal()
        try:
            subscribers = db.query(Subscriber).filter(Subscriber.is_active == True).all()
            
            message = f"URGENT: Flood risk in Chikwawa has reached {int(max_prob*100)}%. Please prepare for possible evacuation."
            
            for sub in subscribers:
                asyncio.run(send_sms_alert(sub.phone_number, message))
                create_alert_log(db, "CRITICAL", "SMS", sub.phone_number)
                
        finally:
            db.close()
