import ee
from app.config import settings
def initialize_gee():
    """
    Initializes the Google Earth Engine API using service account credentials.
    """
    try:
        # Note: In a containerized environment, the key file is at GEE_PRIVATE_KEY_PATH
        ee.Initialize(
            ee.ServiceAccountCredentials(
                settings.GEE_SERVICE_ACCOUNT, 
                settings.GEE_PRIVATE_KEY_PATH
            )
        )
        return True
    except Exception as e:
        print(f"Error initializing GEE: {e}")
        return False
