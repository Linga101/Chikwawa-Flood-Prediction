import pandas as pd
from sqlalchemy.orm import Session
from app.core.preprocessing.spatial_resample import resample_to_grid
from app.core.preprocessing.lag_features import apply_path_a_logic
from app.core.preprocessing.normalizer import normalize_features

def run_preprocessing_pipeline(raw_data: dict, db: Session) -> pd.DataFrame:
    """
    Master orchestrator that transforms raw API data into model-ready features.
    """
    # 1. Resample all sources to the 1km grid
    grid_df = resample_to_grid(raw_data, "geospatial/chikwawa_grid.geojson")
    
    # 2. Apply Path A logic (Incorporate 7-day rainfall accumulation + soil amplification)
    grid_df = apply_path_a_logic(grid_df, db, raw_data)
    
    # 3. Normalize features using the trained scaler
    # Note: We return raw + scaled if needed, but here we just return the final input row
    final_features = normalize_features(grid_df)
    
    return final_features
