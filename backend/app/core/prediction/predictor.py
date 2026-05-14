import pandas as pd
from app.core.prediction.model_loader import model_loader

def predict(features_df: pd.DataFrame):
    """
    Takes a preprocessed and normalized DataFrame (9 features) 
    and returns flood probabilities.
    """
    model, scaler = model_loader.load()
    
    # Ensure columns are in the correct order (matching training)
    expected_columns = [
        'Elevation_m', 'Slope_deg', 'NDVI', 'Rainfall_mm', 
        'Dist_River_m', 'topographic_wet_index', 'elevation_to_river', 
        'LC_codes', 'PS_codes'
    ]
    
    df = features_df[expected_columns]
    
    # Scale the features
    # Note: Rainfall_mm has already been replaced by Rainfall_7day_sum 
    # in the preprocessing pipeline (Path A logic)
    X_scaled = scaler.transform(df)
    
    # Predict probabilities [P(no flood), P(flood)]
    # We want the probability of flood (index 1)
    probabilities = model.predict_proba(X_scaled)[:, 1]
    
    return probabilities
