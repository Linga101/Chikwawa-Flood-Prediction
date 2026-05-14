import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_latest_risk_endpoint():
    response = client.get("/api/v1/latest-risk")
    # Should be 200 even if empty
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_rainfall_trends_endpoint():
    response = client.get("/api/v1/rainfall-trends")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_auth_login_fail():
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "wronguser", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_map_data_endpoint():
    response = client.get("/api/v1/map-data")
    assert response.status_code == 200
    # Should return a FeatureCollection (even if empty)
    assert "type" in response.json()
    assert response.json()["type"] == "FeatureCollection"
