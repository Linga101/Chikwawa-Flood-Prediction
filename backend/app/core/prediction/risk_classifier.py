def classify_risk(probability: float) -> str:
    """
    Converts raw probability into human-readable risk levels.
    """
    if probability < 0.3:
        return "LOW"
    elif probability < 0.6:
        return "MEDIUM"
    elif probability < 0.85:
        return "HIGH"
    else:
        return "CRITICAL"

def get_color_code(risk_level: str) -> str:
    """
    Returns hex color codes for dashboard visualization.
    """
    mapping = {
        "LOW": "#27ae60",      # Green
        "MEDIUM": "#f1c40f",   # Yellow
        "HIGH": "#e67e22",     # Orange
        "CRITICAL": "#c0392b"  # Red
    }
    return mapping.get(risk_level, "#7f8c8d")
