import httpx
from app.config import settings

async def fetch_river_level():
    """
    Calls the DAHITI API to get satellite-derived Shire River water levels.
    """
    api_key = settings.DAHITI_API_KEY
    # Shire River target ID in DAHITI (Hypothetical)
    target_id = "12345" 
    
    url = f"https://dahiti.dgfi.tum.de/api/v1/water_level/?id={target_id}&key={api_key}"
    
    # Placeholder/Mock for now
    try:
        # async with httpx.AsyncClient() as client:
        #     response = await client.get(url)
        #     data = response.json()
        #     return data[0]['value']
        return 4.2 # Mock value in meters
    except Exception as e:
        print(f"Error fetching DAHITI data: {e}")
        return 0.0
