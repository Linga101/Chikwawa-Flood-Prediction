import ee
from app.core.ingestion.gee_client import initialize_gee
from datetime import datetime, timedelta

def fetch_soil_moisture():
    """
    Pulls the latest SMAP (Soil Moisture Active Passive) data from GEE.
    """
    if not initialize_gee():
        return None
    
    roi = ee.Geometry.Rectangle([34.5, -16.5, 35.0, -15.8])
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=14)
    
    # SMAP L3 Soil Moisture (Daily)
    dataset = ee.ImageCollection("NASA/SMAP/SPL3SMP_E/005") \
        .filter(ee.Filter.date(int(start_date.timestamp() * 1000), int(end_date.timestamp() * 1000))) \
        .select('soil_moisture_am')
    
    if dataset.size().getInfo() == 0:
        return 0.0
    
    latest_img = dataset.sort('system:time_start', False).first()
    
    stats = latest_img.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=roi,
        scale=36000 # SMAP resolution is approx 36km
    ).getInfo()
    
    return stats.get('soil_moisture_am', 0.0)
