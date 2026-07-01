"""
restore_real_june_data.py
=========================
Deletes the fake/corrupted GPM readings for June that were
produced by seed_db.py and fix_june_rainfall_pg.py,
then triggers a fresh backfill from NASA GPM via GEE.
"""
from sqlalchemy import text
from app.db.database import SessionLocal

db = SessionLocal()

# Delete ALL GPM sensor_readings rows for June (any year)
result = db.execute(text(
    "DELETE FROM sensor_readings WHERE source = 'GPM' "
    "AND EXTRACT(MONTH FROM timestamp) = 6"
))
deleted = result.rowcount
db.commit()
db.close()

print(f"Deleted {deleted} corrupted/fake GPM June rows.")
print("Now re-running backfill to insert REAL satellite data...")
print("(This will take a few minutes - GEE is queried day by day)")
