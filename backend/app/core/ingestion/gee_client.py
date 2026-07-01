import ee
import os
import base64
import json
from app.config import settings


def _ensure_gee_key_file():
    """
    If GEE_KEY_BASE64 is set (Railway / cloud deployment), decode it and write
    it to GEE_PRIVATE_KEY_PATH so the GEE SDK can read it as a normal file.
    This means the JSON key never has to live in the repository.
    On local dev the file already exists on disk, so this is a no-op.
    """
    b64 = os.environ.get("GEE_KEY_BASE64", "").strip()
    if not b64:
        return  # Local dev — file already on disk

    key_path = settings.GEE_PRIVATE_KEY_PATH
    if not key_path:
        return

    # Create parent directory if needed
    os.makedirs(os.path.dirname(key_path), exist_ok=True)

    # Decode and write — overwrite each time so updates to the env var take effect
    key_bytes = base64.b64decode(b64)
    with open(key_path, "wb") as f:
        f.write(key_bytes)


def initialize_gee():
    """
    Initializes the Google Earth Engine API using service account credentials.
    In cloud deployments the key is provided as GEE_KEY_BASE64 env variable.
    """
    try:
        _ensure_gee_key_file()
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
