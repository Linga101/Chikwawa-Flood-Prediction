import asyncio
from app.core.alerting.websocket_notifier import manager
from app.core.prediction.risk_classifier import classify_risk, get_color_code, get_alert_message

# Traditional Authority zones used for location-aware messaging
TA_ZONES = ["TA Ngabu", "TA Makhwira", "TA Lundu", "TA Kasisi", "TA Chapananga"]


def check_and_trigger_alerts(probabilities: list, grid_ids: list):
    """
    Evaluates every grid cell prediction and broadcasts a live WebSocket
    notification to the dashboard UI.

    NOTE: SMS dispatching has been intentionally removed from this function.
    This system uses a human-in-the-loop model — an administrator must review
    the risk on the dashboard and manually approve alert dispatch via the
    POST /api/v1/alerts/dispatch endpoint. This prevents automated life-safety
    messages from being sent without human verification.
    """
    if probabilities is None or len(probabilities) == 0:
        return

    import numpy as np
    probabilities = np.asarray(probabilities)

    max_idx  = int(np.argmax(probabilities))
    max_prob = float(probabilities[max_idx])
    grid_id  = grid_ids[max_idx] if grid_ids else "unknown"

    # Resolve the TA zone name for human-readable messages
    ta_location = TA_ZONES[max_idx % len(TA_ZONES)]
    risk_level  = classify_risk(max_prob)
    color       = get_color_code(risk_level)
    message     = get_alert_message(risk_level, location=ta_location, probability=max_prob)

    # Always broadcast the live risk update to the WebSocket dashboard.
    # This turns the dashboard widgets red/amber/green in real time.
    # It does NOT send any SMS — that requires human approval.
    asyncio.run(manager.broadcast_alert({
        "type":        "RISK_UPDATE",
        "risk_level":  risk_level,
        "color":       color,
        "probability": round(float(max_prob), 4),
        "grid_id":     grid_id,
        "location":    ta_location,
        "message":     message,
    }))
