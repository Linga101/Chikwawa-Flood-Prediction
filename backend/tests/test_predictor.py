import pytest
import pandas as pd
import numpy as np
from unittest.mock import MagicMock, patch
from app.core.prediction.predictor import predict

@patch("app.core.prediction.model_loader.model_loader.load")
def test_predict_flow(mock_load):
    # Mock model and scaler
    mock_model = MagicMock()
    mock_scaler = MagicMock()
    
    # Mock model output: [P(no flood), P(flood)]
    mock_model.predict_proba.return_value = np.array([[0.1, 0.9]])
    mock_scaler.transform.return_value = np.zeros((1, 9))
    
    mock_load.return_value = (mock_model, mock_scaler)
    
    # Input DF
    df = pd.DataFrame([{
        'Elevation_m': 1, 'Slope_deg': 1, 'NDVI': 1, 'Rainfall_mm': 1,
        'Dist_River_m': 1, 'topographic_wet_index': 1, 'elevation_to_river': 1,
        'LC_codes': 1, 'PS_codes': 1
    }])
    
    probs = predict(df)
    
    assert len(probs) == 1
    assert probs[0] == 0.9
    mock_model.predict_proba.assert_called_once()
