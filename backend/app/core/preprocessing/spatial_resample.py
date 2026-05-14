import pandas as pd
import geopandas as gpd
from shapely.geometry import Point

def resample_to_grid(raw_data: dict, grid_geojson_path: str) -> pd.DataFrame:
    """
    Snaps various data sources (points, rasters, polygons) to a unified 1km grid.
    
    raw_data: dictionary of fetched data from GEE/DAHITI
    grid_geojson_path: path to the Chikwawa 1km grid reference
    """
    # Load the reference grid
    # grid = gpd.read_file(grid_geojson_path)
    
    # Logic:
    # 1. Convert raw_data to a GeoDataFrame
    # 2. Perform a spatial join (sjoin) with the 1km grid
    # 3. Aggregate values (mean) per grid_id
    
    # Mocking a single row for demonstration of the pipeline
    mock_row = {
        'grid_id': 'CHIK_001',
        'Elevation_m': raw_data.get('elevation', 100.0),
        'Slope_deg': raw_data.get('slope', 2.5),
        'NDVI': raw_data.get('ndvi', 0.45),
        'Rainfall_mm': raw_data.get('rainfall', 10.0),
        'Dist_River_m': raw_data.get('dist_river', 500.0),
        'topographic_wet_index': raw_data.get('twi', 8.2),
        'elevation_to_river': raw_data.get('rel_elev', 5.0),
        'LC_codes': raw_data.get('land_cover', 10),
        'PS_codes': raw_data.get('soil_moisture', 0.25)
    }
    
    return pd.DataFrame([mock_row]).set_index('grid_id')
