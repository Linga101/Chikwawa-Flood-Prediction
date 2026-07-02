import ee

# Approximate TA zone polygon centroids for Chikwawa District
TA_ZONE_CENTROIDS = {
    "TA Ngabu": [-16.440, 34.869],
    "TA Makhwira": [-16.180, 34.950],
    "TA Lundu": [-16.033, 34.800],
    "TA Kasisi": [-15.960, 34.769],
    "TA Chapananga": [-16.100, 34.650],
}

def get_ta_feature_collection(buffer_meters=5000):
    """
    Returns an ee.FeatureCollection representing the TA zones.
    Each Feature is a Point buffered by `buffer_meters` to represent the zone area,
    with a 'name' property set to the TA name.
    """
    features = []
    for name, coords in TA_ZONE_CENTROIDS.items():
        # ee.Geometry.Point takes [longitude, latitude]
        geom = ee.Geometry.Point([coords[1], coords[0]]).buffer(buffer_meters)
        features.append(ee.Feature(geom, {'name': name}))
    
    return ee.FeatureCollection(features)
