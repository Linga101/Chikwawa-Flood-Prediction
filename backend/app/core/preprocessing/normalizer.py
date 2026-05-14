import pandas as pd
from app.core.prediction.model_loader import model_loader

def normalize_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Applies the trained scaler to the input features.
    Note: Usually done inside the predictor, but kept here for pipeline modularity.
    """
    _, scaler = model_loader.load()
    
    expected_columns = [
        'Elevation_m', 'Slope_deg', 'NDVI', 'Rainfall_mm', 
        'Dist_River_m', 'topographic_wet_index', 'elevation_to_river', 
        'LC_codes', 'PS_codes'
    ]
    
    # Ensure order
    df_ordered = df[expected_columns]
    
    # Scale
    scaled_values = scaler.transform(df_ordered)
    
    return pd.DataFrame(scaled_values, columns=expected_columns, index=df.index)
