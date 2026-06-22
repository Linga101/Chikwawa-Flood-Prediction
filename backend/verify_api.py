import requests, json

print("=== /latest-risk (all 5 zones) ===")
r1 = requests.get("http://localhost:8000/api/v1/risk/latest-risk")
data = r1.json()
for z in data:
    print(f"  {z['grid_id']:20s}  prob={z['probability']:.4f}  risk={z['risk_level']}")

print()
print("=== Assessment composite scores ===")
for zone in ["TA Ngabu", "TA Makhwira", "TA Lundu", "TA Kasisi", "TA Chapananga"]:
    r = requests.get(f"http://localhost:8000/api/v1/risk/{zone}/assessment")
    d = r.json()
    print(f"  {zone:20s}  composite={d['composite_score']}  factors:")
    for k, f in d["factors"].items():
        print(f"    {k:25s}  score={f['score']}  weight={f['weight']}%")
    print()
