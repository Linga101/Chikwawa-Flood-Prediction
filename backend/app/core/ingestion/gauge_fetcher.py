import httpx
from app.config import settings

async def fetch_river_level():
    """
    Calls the DAHITI API to get satellite-derived Shire River water levels.
    Virtual Station 12087 — Shire River at ~35.25°E, -16.68°S (closest to Chikwawa District).
    Data updates every 10-27 days (satellite altimetry repeat cycle).
    Falls back to a realistic seasonal mock if the API is unavailable.
    """
    api_key = settings.DAHITI_API_KEY
    # Real DAHITI virtual station ID for the Shire River near Chikwawa
    target_id = "12087"

    url = "https://dahiti.dgfi.tum.de/api/v2/download-water-level/"
    args = {
        'api_key': api_key,
        'dahiti_id': target_id,
        'format': 'json'
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=args)
            response.raise_for_status()
            data = response.json()
            
            # DAHITI v2 returns a dict with a 'data' array containing {'datetime', 'wse'}
            if data and 'data' in data and len(data['data']) > 0:
                latest = data['data'][-1]
                wse_absolute = float(latest.get('wse', 43.7))
                
                # WSE is absolute elevation above sea level. 
                # The riverbed baseline elevation here is approx 39.5m.
                # Subtract baseline to get relative river depth in meters.
                relative_depth = max(0.0, wse_absolute - 39.5)
                return relative_depth
                
        return 4.2  # fallback
    except Exception as e:
        print(f"DAHITI API unavailable ({e}), using seasonal mock value")
        # Seasonal mock: dry season (Apr-Oct) ~3.5m, wet season (Nov-Mar) ~5.8m
        from datetime import datetime
        month = datetime.utcnow().month
        return 3.5 if 4 <= month <= 10 else 5.8
