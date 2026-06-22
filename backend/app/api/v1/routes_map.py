from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app.db.crud.crud_predictions import get_latest_predictions

router = APIRouter()

# Approximate TA zone polygon centroids and bounding boxes for Chikwawa District
# These are static geographic facts — they don't change
TA_ZONE_GEODATA = [
    {
        "name": "TA Ngabu",
        "centroid": [-16.440, 34.869],
        "description": "Southern Chikwawa, major trading center in lower Shire",
    },
    {
        "name": "TA Makhwira",
        "centroid": [-16.180, 34.950],
        "description": "East bank of the Shire River, highly flood-prone",
    },
    {
        "name": "TA Lundu",
        "centroid": [-16.033, 34.800],
        "description": "Central district, encompassing Chikwawa Boma",
    },
    {
        "name": "TA Kasisi",
        "centroid": [-15.960, 34.769],
        "description": "Northern border zone, near Kapichira",
    },
    {
        "name": "TA Chapananga",
        "centroid": [-16.100, 34.650],
        "description": "Western highland area, lower flood exposure",
    },
]


@router.get("/map-data")
async def get_map_geojson(db: Session = Depends(get_db)):
    """
    Returns a GeoJSON FeatureCollection of the 5 Traditional Authority zones
    in Chikwawa District, enriched with the latest ML flood risk predictions.

    Each feature is a Point at the zone centroid. The map frontend uses these
    to draw the risk circles and populate popups with live probability data.
    """
    # Pull the latest predictions from the database
    latest = get_latest_predictions(db)
    risk_lookup = {p.grid_id: p for p in latest} if latest else {}

    features = []
    for zone in TA_ZONE_GEODATA:
        name = zone["name"]
        prediction = risk_lookup.get(name)

        probability = round(prediction.probability, 4) if prediction else 0.0
        risk_level  = prediction.risk_level if prediction else "UNKNOWN"

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [zone["centroid"][1], zone["centroid"][0]],  # GeoJSON is [lng, lat]
            },
            "properties": {
                "name":        name,
                "probability": probability,
                "risk_level":  risk_level,
                "description": zone["description"],
                "pct":         round(probability * 100, 1),
            },
        })

    return {
        "type":     "FeatureCollection",
        "features": features,
    }
