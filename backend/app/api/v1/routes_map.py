from fastapi import APIRouter
import json
import os

router = APIRouter()

@router.get("/map-data")
async def get_map_geojson():
    """
    Returns the GeoJSON of Chikwawa boundaries. 
    In a real scenario, this would be enriched with live risk data.
    """
    geojson_path = "geospatial/chikwawa_boundaries.geojson"
    if not os.path.exists(geojson_path):
        return {"type": "FeatureCollection", "features": []}
        
    with open(geojson_path, "r") as f:
        return json.load(f)
