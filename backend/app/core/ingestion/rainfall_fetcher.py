import ee
from app.core.ingestion.gee_client import initialize_gee
from datetime import datetime, timedelta

def fetch_latest_rainfall():
    """
    Pulls the latest GPM (Global Precipitation Measurement) data from GEE.
    """
    if not initialize_gee():
        return None
    
    # chikwawa_roi = ee.FeatureCollection("users/your-username/chikwawa_roi")
    # For now, using a representative point or bounding box
    roi = ee.Geometry.Rectangle([34.5, -16.5, 35.0, -15.8]) # Chikwawa approx
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(hours=6)
    
    dataset = ee.ImageCollection('NASA/GPM_L3/IMERG_V07') \
        .filterDate(int(start_date.timestamp() * 1000), int(end_date.timestamp() * 1000)) \
        .select('precipitation')
    
    # Get the mean or sum over the region
    stats = dataset.mean().reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=roi,
        scale=10000 # GPM resolution is approx 10km
    ).getInfo()
    
    return stats.get('precipitation', 0.0)
