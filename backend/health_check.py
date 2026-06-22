import urllib.request
import json

endpoints = [
    ("latest-risk",    "http://localhost:8000/api/v1/risk/latest-risk"),
    ("activity-feed",  "http://localhost:8000/api/v1/risk/activity-feed?limit=3"),
    ("rainfall-trends","http://localhost:8000/api/v1/charts/rainfall-trends?window=7"),
    ("river-levels",   "http://localhost:8000/api/v1/charts/river-levels"),
    ("historical-evts","http://localhost:8000/api/v1/charts/historical-events"),
]

print("=== Backend API Health Check ===")
all_ok = True
for name, url in endpoints:
    try:
        r = urllib.request.urlopen(url, timeout=5)
        data = json.loads(r.read())
        count = len(data) if isinstance(data, list) else "dict"
        print(f"  OK  {name}: returned {count} items")
    except Exception as e:
        print(f"  ERR {name}: {e}")
        all_ok = False

print("\n" + ("All endpoints healthy!" if all_ok else "Some endpoints failed!"))
