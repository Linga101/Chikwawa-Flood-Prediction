import ee
from app.core.ingestion.gee_client import initialize_gee
from app.core.ingestion.ta_geodata import get_ta_feature_collection
from datetime import datetime, timedelta

def fetch_ndvi() -> dict:
    """
    Pulls the latest NDVI data from Sentinel-2
    for each individual TA zone.
    Returns a dictionary: {'TA Ngabu': 0.428, 'TA Makhwira': 0.512, ...}
    """
    if not initialize_gee():
        return None
    
    fc = get_ta_feature_collection()
    
    end_date = datetime.utcnow()
    # Sentinel-2 has a 5-day revisit time
    start_date = end_date - timedelta(days=10)
    
    dataset = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED") \
        .filter(ee.Filter.date(int(start_date.timestamp() * 1000), int(end_date.timestamp() * 1000))) \
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    
    if dataset.size().getInfo() == 0:
        return {}
    
    def calculate_ndvi(img):
        ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI')
        return img.addBands(ndvi)
        
    ndvi_dataset = dataset.map(calculate_ndvi).select('NDVI')
    
    stats = ndvi_dataset.mean().reduceRegions(
        collection=fc,
        reducer=ee.Reducer.mean(),
        scale=30 # Sentinel-2 resolution is 10-20m, 30m is safe
    ).getInfo()
    
    results = {}
    if stats and 'features' in stats:
        for feat in stats['features']:
            name = feat['properties'].get('name')
            val = feat['properties'].get('mean', 0.0)
            results[name] = val
            
    return results
