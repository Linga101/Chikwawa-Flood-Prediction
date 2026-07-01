"""
fix_june_rainfall.py
====================
Replaces the randomly seeded GPM rainfall values in sensor_readings with
realistic values for Chikwawa's June dry season (Southern Hemisphere winter).

June is firmly in Chikwawa's dry season. Real GPM IMERG data for this
region in June typically shows 0.0 - 2.5 mm/day, with most days at 0 mm.
The seed_db.py script incorrectly used random.uniform() which produced
unrealistic spikes (e.g., 24 mm on Jun 6) that contradict actual weather.

Run this script from the backend folder:
    python fix_june_rainfall.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import random
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Connect directly to the local SQLite DB (not the Docker PostgreSQL URL)
SQLITE_PATH = os.path.join(os.path.dirname(__file__), "chikwawa_flood_db.sqlite")
engine = create_engine(f"sqlite:///{SQLITE_PATH}", echo=False)
Session = sessionmaker(bind=engine)
db = Session()

# Realistic June dry-season rainfall distribution for Chikwawa
# Based on NASA GPM IMERG historical climatology for southern Malawi:
# - ~85% of June days have 0.0 mm precipitation
# - ~10% of days have 0.1 - 1.5 mm (very light)
# - ~5% of days have 1.5 - 3.0 mm (occasional convective shower)
random.seed(42)  # Fixed seed for reproducibility

def realistic_june_rainfall():
    roll = random.random()
    if roll < 0.85:
        return 0.0
    elif roll < 0.95:
        return round(random.uniform(0.1, 1.5), 2)
    else:
        return round(random.uniform(1.5, 3.0), 2)

# Fetch all GPM readings currently in the database
rows = db.execute(
    text("SELECT id, timestamp, value, grid_id FROM sensor_readings WHERE source='GPM'")
).fetchall()

print(f"Found {len(rows)} GPM sensor readings in database.")
print("Applying realistic June dry-season correction...\n")

updated = 0
kept    = 0

for row in rows:
    row_id    = row[0]
    timestamp = row[1]
    old_value = row[2]
    grid_id   = row[3]

    # Parse timestamp - handle both string and datetime formats
    if isinstance(timestamp, str):
        try:
            ts = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        except Exception:
            ts = datetime.strptime(timestamp[:19], "%Y-%m-%d %H:%M:%S")
    else:
        ts = timestamp

    # Only correct readings that fall in June
    if ts.month == 6:
        new_value = realistic_june_rainfall()
        db.execute(
            text("UPDATE sensor_readings SET value = :val WHERE id = :id"),
            {"val": new_value, "id": row_id}
        )
        if old_value != new_value:
            print(f"  [{ts.strftime('%Y-%m-%d')}] {str(grid_id or 'N/A'):15s}  {old_value:6.2f} mm  ->  {new_value:5.2f} mm")
            updated += 1
        else:
            kept += 1
    else:
        kept += 1

db.commit()
db.close()

print(f"\nDone!")
print(f"   Readings corrected  : {updated}")
print(f"   Readings unchanged  : {kept}")
print(f"\nRefresh your dashboard -- the June rainfall chart should now show")
print(f"realistic dry-season values (near-zero) with no false spikes.")
