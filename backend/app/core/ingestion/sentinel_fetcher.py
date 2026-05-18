import ee
from app.core.ingestion.gee_client import initialize_gee
from datetime import datetime, timedelta

def fetch_ndvi():
    """
    Pulls the latest NDVI from Sentinel-2 data in GEE.
    """
    if not initialize_gee():
        return None
    
    roi = ee.Geometry.Rectangle([34.5, -16.5, 35.0, -15.8])
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    
    # Sentinel-2 Surface Reflectance
    collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED") \
        .filterBounds(roi) \
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
        .filterDate(int(start_date.timestamp() * 1000), int(end_date.timestamp() * 1000))
    
    if collection.size().getInfo() == 0:
        return 0.5 # Fallback
    
    latest_img = collection.sort('system:time_start', False).first()
    
    # Calculate NDVI: (NIR - Red) / (NIR + Red)
    # NIR is B8, Red is B4 in Sentinel-2
    ndvi = latest_img.normalizedDifference(['B8', 'B4']).rename('NDVI')
    
    stats = ndvi.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=roi,
        scale=10 # Sentinel-2 is 10m
    ).getInfo()
    
    return stats.get('NDVI', 0.5)
