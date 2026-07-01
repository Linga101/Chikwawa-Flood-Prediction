from app.db.database import SessionLocal
from app.db.models.User import User
from sqlalchemy import text

db = SessionLocal()

# Check admin credentials
user = db.query(User).first()
if user:
    print(f"Admin username : {user.username}")
    print(f"Admin role     : {user.role}")
    print(f"Is active      : {user.is_active}")

# Check SMAP data quality
smap = db.execute(text(
    "SELECT COUNT(id), AVG(value), MAX(value) FROM sensor_readings WHERE source='SMAP'"
)).fetchone()
print(f"SMAP readings  : count={smap[0]}, avg={round(float(smap[1] or 0),4)}, max={round(float(smap[2] or 0),4)}")

# Check latest Celery predictions
latest = db.execute(text(
    "SELECT run_timestamp, grid_id, risk_level, probability FROM prediction_logs ORDER BY run_timestamp DESC LIMIT 5"
)).fetchall()
print("Latest 5 predictions:")
for r in latest:
    print(f"  {r[0]}  {str(r[1]):15s}  {r[2]:6s}  {round(float(r[3]),4)}")

db.close()
