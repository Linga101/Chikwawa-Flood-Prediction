import pytest
from unittest.mock import patch, MagicMock
from app.core.ingestion.rainfall_fetcher import fetch_latest_rainfall
from app.core.ingestion.soil_fetcher import fetch_soil_moisture

@patch("app.core.ingestion.gee_client.initialize_gee")
@patch("app.core.ingestion.rainfall_fetcher.ee")
def test_fetch_latest_rainfall(mock_ee, mock_init):
    mock_init.return_value = True
    
    # Mock GEE reduceRegion result
    mock_stats = MagicMock()
    mock_stats.getInfo.return_value = {'precipitationCal': 12.5}
    
    mock_ee.ImageCollection.return_value.filterDate.return_value.select.return_value.mean.return_value.reduceRegion.return_value = mock_stats
    
    val = fetch_latest_rainfall()
    assert val == 12.5

@patch("app.core.ingestion.gee_client.initialize_gee")
@patch("app.core.ingestion.soil_fetcher.ee")
def test_fetch_soil_moisture(mock_ee, mock_init):
    mock_init.return_value = True
    
    mock_stats = MagicMock()
    mock_stats.getInfo.return_value = {'soil_moisture_am': 0.35}
    
    # Mock chain
    mock_ee.ImageCollection.return_value.filter.return_value.select.return_value.size.return_value.getInfo.return_value = 1
    mock_ee.ImageCollection.return_value.filter.return_value.select.return_value.sort.return_value.first.return_value.reduceRegion.return_value = mock_stats
    
    val = fetch_soil_moisture()
    assert val == 0.35
