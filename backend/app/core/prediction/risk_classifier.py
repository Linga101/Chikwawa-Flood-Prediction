def classify_risk(probability: float) -> str:
    """
    Converts raw probability into human-readable risk levels.
    Three tiers: LOW, MEDIUM, HIGH.
    """
    if probability < 0.3:
        return "LOW"
    elif probability < 0.6:
        return "MEDIUM"
    else:
        return "HIGH"

def get_color_code(risk_level: str) -> str:
    """
    Returns hex color codes for dashboard visualization.
    Aligned with Readdy.ai semantic color palette.
    """
    mapping = {
        "LOW":    "#27ae60",  # Green  — safe conditions
        "MEDIUM": "#f39c12",  # Amber  — elevated caution
        "HIGH":   "#c0392b",  # Red    — immediate danger
    }
    return mapping.get(risk_level, "#7f8c8d")

def get_alert_message(risk_level: str, location: str = "Chikwawa", probability: float = 0.0) -> str:
    """
    Returns a tailored, human-readable alert message per risk tier.
    This drives the real-time Activity Feed on the dashboard.
    """
    pct = int(probability * 100)
    messages = {
        "LOW": (
            f"Normal conditions observed in {location}. "
            f"Flood probability is {pct}%. No action required."
        ),
        "MEDIUM": (
            f"Elevated flood risk detected in {location}. "
            f"Flood probability has risen to {pct}%. "
            f"Communities near the Shire River should stay alert."
        ),
        "HIGH": (
            f"HIGH FLOOD RISK in {location}! "
            f"Flood probability is {pct}%. "
            f"Immediate preparedness action required. "
            f"Authorities in TA Ngabu, TA Makhwira and TA Lundu should initiate evacuation protocols."
        ),
    }
    return messages.get(risk_level, f"Risk update for {location}: {pct}% probability.")
