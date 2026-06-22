"""
backfill_real_data.py
=====================
Pulls REAL historical satellite data from GEE for the past 30 days and
inserts one reading per zone per day into sensor_readings.

Sources:
  GPM      — NASA IMERG daily precipitation (mm)
  SMAP     — NASA soil moisture (m³/m³)
  Sentinel — Copernicus Sentinel-2 NDVI (every 5 days)

Run inside the Docker container:
  docker exec chikwawa_app python backfill_real_data.py
"""

import ee
import sys
from datetime import datetime, timedelta, timezone
from app.config import settings
from app.core.ingestion.gee_client import initialize_gee
from app.db.database import SessionLocal
from app.db.models.SensorReading import SensorReading

# ── Chikwawa district bounding box ───────────────────────────────────────────
CHIKWAWA_BBOX = [34.20, -16.50, 35.50, -15.80]

TA_ZONES = [
    "TA Ngabu",
    "TA Makhwira",
    "TA Lundu",
    "TA Kasisi",
    "TA Chapananga",
]

BACKFILL_DAYS = 30


def fetch_gpm_for_day(date: datetime) -> float:
    """Return mean daily precipitation (mm) over Chikwawa for a given date."""
    start = date.strftime("%Y-%m-%d")
    end   = (date + timedelta(days=1)).strftime("%Y-%m-%d")
    roi   = ee.Geometry.Rectangle(CHIKWAWA_BBOX)
    try:
        col = (
            ee.ImageCollection("NASA/GPM_L3/IMERG_V07")
            .filterDate(start, end)
            .filterBounds(roi)
            .select("precipitation")
        )
        if col.size().getInfo() == 0:
            return 0.0
        val = col.mean().reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=roi,
            scale=11132,
            maxPixels=1e9,
        ).get("precipitation").getInfo()
        # IMERG is mm/hr — multiply by 24 for daily total
        return round((val or 0.0) * 24, 4)
    except Exception as e:
        print(f"    GPM error {start}: {e}")
        return 0.0


def fetch_smap_for_day(date: datetime) -> float:
    """Return mean soil moisture (m³/m³) for a 3-day window (SMAP repeat cycle)."""
    start = date.strftime("%Y-%m-%d")
    end   = (date + timedelta(days=3)).strftime("%Y-%m-%d")
    roi   = ee.Geometry.Rectangle(CHIKWAWA_BBOX)
    try:
        col = (
            ee.ImageCollection("NASA_USDA/HSL/SMAP10KM_soil_moisture")
            .filterDate(start, end)
            .filterBounds(roi)
            .select("ssm")
        )
        if col.size().getInfo() == 0:
            return 0.0
        val = col.mean().reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=roi,
            scale=10000,
            maxPixels=1e9,
        ).get("ssm").getInfo()
        return round(val or 0.0, 4)
    except Exception as e:
        print(f"    SMAP error {start}: {e}")
        return 0.0


def fetch_ndvi_for_window(start_date: datetime, end_date: datetime):
    """Return mean NDVI from Sentinel-2 for a 5-day cloud-free composite."""
    start = start_date.strftime("%Y-%m-%d")
    end   = end_date.strftime("%Y-%m-%d")
    roi   = ee.Geometry.Rectangle(CHIKWAWA_BBOX)
    try:
        col = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterDate(start, end)
            .filterBounds(roi)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
        )
        if col.size().getInfo() == 0:
            return None
        ndvi_col = col.map(lambda img: img.normalizedDifference(["B8", "B4"]).rename("NDVI"))
        val = ndvi_col.mean().reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=roi,
            scale=10,
            maxPixels=1e9,
        ).get("NDVI").getInfo()
        return round(val or 0.0, 4)
    except Exception as e:
        print(f"    NDVI error {start}–{end}: {e}")
        return None


def already_stored(db, source: str, grid_id: str, day: datetime) -> bool:
    """True if a reading already exists for this source/zone/day."""
    day_start = day.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    day_end   = day_start + timedelta(days=1)
    return db.query(SensorReading).filter(
        SensorReading.source    == source,
        SensorReading.grid_id   == grid_id,
        SensorReading.timestamp >= day_start,
        SensorReading.timestamp <  day_end,
    ).first() is not None


def main():
    print("Authenticating with Google Earth Engine…")
    ok = initialize_gee()
    if not ok:
        print("ERROR: GEE authentication failed. Aborting.")
        sys.exit(1)
    print("✓ GEE authenticated\n")

    db    = SessionLocal()
    today = datetime.now(timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0)

    print(f"Backfilling {BACKFILL_DAYS} days of REAL satellite data…")
    print(f"Period: {(today - timedelta(days=BACKFILL_DAYS)).date()} → {today.date()}\n")

    gpm_inserted  = 0
    smap_inserted = 0
    ndvi_inserted = 0
    skipped       = 0

    for day_offset in range(BACKFILL_DAYS, 0, -1):
        day     = today - timedelta(days=day_offset)
        day_str = day.strftime("%Y-%m-%d")
        print(f"[{day_str}]")

        # ── GPM daily rainfall ────────────────────────────────────────────────
        gpm_val = fetch_gpm_for_day(day)
        print(f"  GPM  : {gpm_val:.4f} mm")
        for zone in TA_ZONES:
            if already_stored(db, "GPM", zone, day):
                skipped += 1
                continue
            db.add(SensorReading(
                source    = "GPM",
                grid_id   = zone,
                value     = gpm_val,
                timestamp = day.replace(hour=6),
            ))
            gpm_inserted += 1

        # ── SMAP soil moisture ────────────────────────────────────────────────
        smap_val = fetch_smap_for_day(day)
        print(f"  SMAP : {smap_val:.4f} m³/m³")
        for zone in TA_ZONES:
            if already_stored(db, "SMAP", zone, day):
                skipped += 1
                continue
            db.add(SensorReading(
                source    = "SMAP",
                grid_id   = zone,
                value     = smap_val,
                timestamp = day.replace(hour=6),
            ))
            smap_inserted += 1

        # ── NDVI every 5 days to limit GEE compute ───────────────────────────
        if day_offset % 5 == 0:
            ndvi_val = fetch_ndvi_for_window(day, day + timedelta(days=5))
            if ndvi_val is not None:
                print(f"  NDVI : {ndvi_val:.4f}")
                for zone in TA_ZONES:
                    if already_stored(db, "Sentinel-2", zone, day):
                        skipped += 1
                        continue
                    db.add(SensorReading(
                        source    = "Sentinel-2",
                        grid_id   = zone,
                        value     = ndvi_val,
                        timestamp = day.replace(hour=6),
                    ))
                    ndvi_inserted += 1

        db.commit()

    db.close()

    print(f"\n{'='*50}")
    print(f"✅  Backfill complete!")
    print(f"   GPM rows inserted   : {gpm_inserted}")
    print(f"   SMAP rows inserted  : {smap_inserted}")
    print(f"   NDVI rows inserted  : {ndvi_inserted}")
    print(f"   Skipped (existing)  : {skipped}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
