import ee
from app.core.ingestion.gee_client import initialize_gee
from app.core.ingestion.ta_geodata import get_ta_feature_collection
from datetime import datetime, timedelta

def fetch_latest_rainfall() -> dict:
    """
    Pulls the latest GPM (Global Precipitation Measurement) data from GEE
    for each individual TA zone.
    Returns a dictionary: {'TA Ngabu': 12.4, 'TA Makhwira': 15.1, ...}
    """
    if not initialize_gee():
        return None
    
    fc = get_ta_feature_collection()
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(hours=6)
    
    dataset = ee.ImageCollection('NASA/GPM_L3/IMERG_V07') \
        .filterDate(int(start_date.timestamp() * 1000), int(end_date.timestamp() * 1000)) \
        .select('precipitation')
    
    if dataset.size().getInfo() == 0:
        return {}

    
    stats = dataset.mean().reduceRegions(
        collection=fc,
        reducer=ee.Reducer.mean(),
        scale=10000
    ).getInfo()
    
    results = {}
    if stats and 'features' in stats:
        for feat in stats['features']:
            name = feat['properties'].get('name')
            # GPM is mm/hr, reduceRegions on mean() gives mean mm/hr over the 6h window.
            # To get mm accumulation over 6h, multiply by 6.
            # However, previously the code just stored the mean raw value.
            # We'll just store the raw mean for consistency with previous behavior,
            # or multiply by 6 if the model expects accumulation. The previous code
            # just did `stats.get('precipitation', 0.0)`.
            val = feat['properties'].get('mean', 0.0) # reduceRegions with mean reducer outputs 'mean'
            results[name] = val
            
    return results
