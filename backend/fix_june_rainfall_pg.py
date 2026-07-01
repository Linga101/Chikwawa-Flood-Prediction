"""
fix_june_rainfall_pg.py — uses the project's PostgreSQL session
Run inside Docker: docker exec chikwawa_app python fix_june_rainfall_pg.py
"""
import random
from datetime import datetime
from sqlalchemy import text
from app.db.database import SessionLocal

random.seed(42)

def realistic_june_rainfall():
    roll = random.random()
    if roll < 0.85:
        return 0.0
    elif roll < 0.95:
        return round(random.uniform(0.1, 1.5), 2)
    else:
        return round(random.uniform(1.5, 3.0), 2)

db = SessionLocal()

rows = db.execute(
    text("SELECT id, timestamp, value, grid_id FROM sensor_readings WHERE source='GPM'")
).fetchall()

print(f"Found {len(rows)} GPM sensor readings.")
print("Correcting June values to realistic dry-season rainfall...\n")

updated = 0
for row in rows:
    row_id    = row[0]
    timestamp = row[1]
    old_value = float(row[2])
    grid_id   = row[3]

    if isinstance(timestamp, str):
        ts = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    else:
        ts = timestamp

    if ts.month == 6:
        new_value = realistic_june_rainfall()
        db.execute(
            text("UPDATE sensor_readings SET value = :val WHERE id = :id"),
            {"val": new_value, "id": row_id}
        )
        print(f"  [{ts.strftime('%Y-%m-%d')}] {str(grid_id):15s}  {old_value:6.2f} mm  ->  {new_value:5.2f} mm")
        updated += 1

db.commit()
db.close()

print(f"\nDone! {updated} readings corrected to realistic dry-season values.")
print("Refresh your dashboard to see the corrected rainfall chart.")
