import pandas as pd
import pytest
from unittest.mock import MagicMock
from app.core.preprocessing.lag_features import apply_path_a_logic

def test_apply_path_a_logic():
    # Mock dataframe with 9 features
    df = pd.DataFrame([{
        'Elevation_m': 100, 'Slope_deg': 2, 'NDVI': 0.5, 'Rainfall_mm': 5,
        'Dist_River_m': 500, 'topographic_wet_index': 8, 'elevation_to_river': 5,
        'LC_codes': 10, 'PS_codes': 0.2
    }])
    
    # Mock DB session
    mock_db = MagicMock()
    # Mock the sum return value (e.g., 7-day sum is 50.0)
    mock_db.query().filter().scalar.return_value = 50.0
    
    result_df = apply_path_a_logic(df, mock_db)
    
    # Verify Rainfall_mm was replaced by the lag sum
    assert result_df.iloc[0]['Rainfall_mm'] == 50.0
    assert len(result_df.columns) == 10 # 9 features + index
