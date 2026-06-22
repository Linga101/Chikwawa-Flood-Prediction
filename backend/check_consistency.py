import requests

print("=== CONSISTENCY CHECK: Dashboard vs Risk Assessment ===\n")

# Dashboard data (from /latest-risk)
r1 = requests.get("http://localhost:8000/api/v1/risk/latest-risk")
dashboard_data = {z["grid_id"]: z for z in r1.json()}

zones = ["TA Ngabu", "TA Makhwira", "TA Lundu", "TA Kasisi", "TA Chapananga"]

all_ok = True
for zone in zones:
    # Assessment data
    r2 = requests.get(f"http://localhost:8000/api/v1/risk/{zone}/assessment")
    assessment = r2.json()
    
    dash    = dashboard_data.get(zone, {})
    dash_prob   = dash.get("probability", 0)
    dash_pct    = round(dash_prob * 100, 1)
    dash_risk   = dash.get("risk_level", "N/A")
    
    ass_comp    = assessment.get("composite_score", 0)
    ass_ml_prob = assessment.get("ml_probability", 0)
    
    # Check consistency: composite should equal probability * 100
    match = abs(dash_pct - ass_comp) < 0.2
    if not match:
        all_ok = False
    
    status = "✓ MATCH" if match else "✗ MISMATCH"
    print(f"{status}  {zone}")
    print(f"        Dashboard: prob={dash_prob:.4f} ({dash_pct}%)  risk={dash_risk}")
    print(f"        Assessment: composite={ass_comp}  ml_prob={ass_ml_prob}")
    
    # Factor breakdown
    factors = assessment.get("factors", {})
    for k, f in factors.items():
        print(f"          {k:25s} score={f['score']}/100  weight={f['weight']}%")
    print()

print("ALL ZONES CONSISTENT:", all_ok)
