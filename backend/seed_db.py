"""
Database seeder for the Chikwawa Flood Prediction System.
Populates the SQLite database with realistic initial data so the
frontend can display real backend data instead of hardcoded fallbacks.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta
import random

from app.db.database import engine, Base, SessionLocal
from app.db.models.SensorReading import SensorReading
from app.db.models.PredictionLog import PredictionLog
from app.db.models.AlertLog import AlertLog
from app.db.models.HistoricalEvent import HistoricalEvent
from app.db.models.Subscriber import Subscriber

# Ensure all tables exist
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# ── 1. Seed Sensor Readings (GPM rainfall, SMAP soil, DAHITI river) ──

now = datetime.utcnow()

print("Seeding sensor readings...")

ta_zones = [
    ("TA Ngabu",      0.72),
    ("TA Makhwira",   0.45),
    ("TA Lundu",      0.28),
    ("TA Kasisi",     0.58),
    ("TA Chapananga", 0.35),
]

# GPM rainfall readings – 30 days of daily data PER TA
for grid_id, base_prob in ta_zones:
    for day_offset in range(30):
        ts = now - timedelta(days=day_offset, hours=random.randint(0, 12))
        # TA specific baseline
        baseline = base_prob * 30
        rainfall_mm = random.uniform(baseline, baseline + 30.0) if random.random() > 0.3 else random.uniform(0.0, 5.0)
        db.add(SensorReading(source="GPM", timestamp=ts, value=round(rainfall_mm, 2), grid_id=grid_id))

# SMAP soil saturation – 30 days PER TA
for grid_id, base_prob in ta_zones:
    for day_offset in range(30):
        ts = now - timedelta(days=day_offset, hours=random.randint(0, 12))
        soil_vwc = random.uniform(base_prob * 0.5, min(1.0, base_prob + 0.4))
        db.add(SensorReading(source="SMAP", timestamp=ts, value=round(soil_vwc, 3), grid_id=grid_id))

# DAHITI river level – 30 days (metres) - NOT TA SPECIFIC
for day_offset in range(30):
    ts = now - timedelta(days=day_offset, hours=random.randint(0, 12))
    river_m = random.uniform(2.5, 5.2)
    db.add(SensorReading(source="DAHITI", timestamp=ts, value=round(river_m, 2), grid_id=None))

db.commit()
print(f"  -> Inserted {30 * len(ta_zones) * 2 + 30} sensor readings (GPM + SMAP per TA + DAHITI)")

# ── 2. Seed Prediction Logs (one prediction run for each TA zone) ──

print("Seeding prediction logs...")

run_ts = now - timedelta(minutes=15)

for grid_id, base_prob in ta_zones:
    prob = round(base_prob + random.uniform(-0.08, 0.08), 4)
    prob = max(0.0, min(1.0, prob))
    if prob >= 0.6:
        level = "HIGH"
    elif prob >= 0.3:
        level = "MEDIUM"
    else:
        level = "LOW"
    db.add(PredictionLog(
        grid_id=grid_id,
        probability=prob,
        risk_level=level,
        run_timestamp=run_ts
    ))

db.commit()
print(f"  -> Inserted {len(ta_zones)} prediction logs")

# ── 3. Seed Historical Events ──

print("Seeding historical events...")

events = [
    ("2015", "Shire River Flooding",             "High",   174000, "$46M"),
    ("2019", "Cyclone Idai Aftermath",            "High",   868900, "$220M"),
    ("2022", "Cyclone Ana & Gombe Flash Floods",  "High",   952000, "$500M"),
    ("2023", "Cyclone Freddy Devastation",        "High",   659000, "$150M"),
    ("2020", "Minor Seasonal Flooding",           "Medium",  23000, "$4.2M"),
    ("2017", "Localized Ngabu Inundation",        "Medium",  41000, "$8.5M"),
]

for year, name, impact, people, loss in events:
    db.add(HistoricalEvent(
        year=year,
        event_name=name,
        impact_level=impact,
        people_affected=people,
        economic_loss=loss
    ))

db.commit()
print(f"  -> Inserted {len(events)} historical events")

# ── 4. Seed Alert Logs ──

print("Seeding alert logs...")

alert_entries = [
    ("HIGH", "SMS", "+265991234567"),
    ("HIGH", "SMS", "+265888654321"),
    ("MEDIUM", "WS", "broadcast"),
    ("HIGH", "SMS", "+265991234567"),
    ("LOW", "WS", "broadcast"),
]

for i, (level, channel, recipient) in enumerate(alert_entries):
    db.add(AlertLog(
        fired_at=now - timedelta(hours=i * 6),
        risk_level=level,
        channel=channel,
        recipient=recipient,
    ))

db.commit()
print(f"  -> Inserted {len(alert_entries)} alert logs")

# ── 5. Seed Subscribers ──

print("Seeding subscribers...")

subscribers = [
    ("+265991234567", "TA Ngabu"),
    ("+265888654321", "TA Makhwira"),
    ("+265999876543", "TA Lundu"),
    ("+265881112233", "TA Kasisi"),
    ("+265995556677", "TA Chapananga"),
]

for phone, ta in subscribers:
    existing = db.query(Subscriber).filter(Subscriber.phone_number == phone).first()
    if not existing:
        db.add(Subscriber(phone_number=phone, ta_area=ta, is_active=True))

db.commit()
print(f"  -> Inserted {len(subscribers)} subscribers")

db.close()
print("\n✅ Database seeded successfully!")
