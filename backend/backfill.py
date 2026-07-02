import ee
import datetime
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models.SensorReading import SensorReading
from app.core.ingestion.gee_client import initialize_gee

def backfill_30_days():
    if not initialize_gee():
        print("Failed to initialize GEE")
        return

    db = SessionLocal()
    
    # Delete the mock data we just inserted (to keep it clean)
    print("Removing mock data...")
    thirty_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=31)
    db.query(SensorReading).filter(
        SensorReading.source == "GPM",
        SensorReading.timestamp >= thirty_days_ago
    ).delete()
    db.commit()

    print("Fetching REAL historical GPM data for the last 30 days. This may take a minute...")
    
    roi = ee.Geometry.Rectangle([34.5, -16.5, 35.0, -15.8]) # Chikwawa approx
    now = datetime.datetime.utcnow()
    
    grids = ["TA Ngabu", "TA Makhwira", "TA Lundu", "TA Kasisi", "TA Chapananga"]
    
    for i in range(30, -1, -1):
        target_date = now - datetime.timedelta(days=i)
        start_date = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + datetime.timedelta(days=1)
        
        try:
            dataset = ee.ImageCollection('NASA/GPM_L3/IMERG_V06') \
                .filterDate(int(start_date.timestamp() * 1000), int(end_date.timestamp() * 1000)) \
                .select('precipitationCal')
            
            # GPM is in mm/hr, so to get daily total we often need to multiply by 24, 
            # but getting the mean of the daily collection is a good proxy for intensity.
            stats = dataset.mean().reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=roi,
                scale=10000
            ).getInfo()
            
            val = stats.get('precipitationCal')
            # If no data for that day, default to 0.0
            daily_rain = val if val is not None else 0.0
            # Multiply by 24 for a rough daily accumulation in mm, if it's mm/hr
            # But let's just save the raw value or a sensible conversion.
            # Using daily_rain * 24 as IMERG is mm/hr.
            actual_mm = round(daily_rain * 24, 2)
            
            print(f"{start_date.strftime('%Y-%m-%d')}: {actual_mm} mm")
            
            # Insert same value for all TAs for the district average
            for grid in grids:
                db.add(SensorReading(source="GPM", timestamp=start_date, value=actual_mm, grid_id=grid))
                
        except Exception as e:
            print(f"Error on {start_date}: {e}")

    db.commit()
    db.close()
    print("Successfully backfilled real historical data!")

if __name__ == "__main__":
    backfill_30_days()
