import ee
from app.core.ingestion.gee_client import initialize_gee
from app.core.ingestion.ta_geodata import get_ta_feature_collection
from datetime import datetime, timedelta

def fetch_soil_moisture() -> dict:
    """
    Pulls the latest SMAP (Soil Moisture Active Passive) data from GEE
    for each individual TA zone.
    Returns a dictionary: {'TA Ngabu': 0.12, 'TA Makhwira': 0.15, ...}
    """
    if not initialize_gee():
        return None
    
    fc = get_ta_feature_collection()
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=14)
    
    # SMAP L3 Soil Moisture (Daily)
    dataset = ee.ImageCollection("NASA/SMAP/SPL3SMP_E/005") \
        .filter(ee.Filter.date(int(start_date.timestamp() * 1000), int(end_date.timestamp() * 1000))) \
        .select('soil_moisture_am')
    
    if dataset.size().getInfo() == 0:
        return {}
    
    latest_img = dataset.sort('system:time_start', False).first()
    
    stats = latest_img.reduceRegions(
        collection=fc,
        reducer=ee.Reducer.mean(),
        scale=36000 # SMAP resolution is approx 36km
    ).getInfo()
    
    results = {}
    if stats and 'features' in stats:
        for feat in stats['features']:
            name = feat['properties'].get('name')
            val = feat['properties'].get('mean', 0.0)
            results[name] = val
            
    return results
