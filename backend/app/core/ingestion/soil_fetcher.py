import ee
from app.core.ingestion.gee_client import initialize_gee

def fetch_soil_moisture():
    """
    Pulls the latest SMAP (Soil Moisture Active Passive) data from GEE.
    """
    if not initialize_gee():
        return None
    
    roi = ee.Geometry.Rectangle([34.5, -16.5, 35.0, -15.8])
    
    # SMAP L3 Soil Moisture (Daily)
    dataset = ee.ImageCollection("NASA/SMAP/SPL3SMP_E/005") \
        .filter(ee.Filter.date(ee.Date(ee.Date.now().advance(-3, 'day')), ee.Date.now())) \
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
