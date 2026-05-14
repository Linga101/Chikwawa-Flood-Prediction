import httpx
from app.config import settings

async def send_sms_alert(phone_number: str, message: str):
    """
    Sends an SMS alert via the Airtel Malawi Bulk SMS API.
    """
    api_key = settings.AIRTEL_MALAWI_API_KEY
    sender_id = settings.AIRTEL_MALAWI_SENDER_ID
    
    # Placeholder Airtel Malawi API endpoint
    url = "https://api.airtel.mw/bulk-sms/v1/send"
    
    payload = {
        "apiKey": api_key,
        "senderId": sender_id,
        "recipient": phone_number,
        "message": message
    }
    
    # Placeholder for actual network call
    try:
        print(f"DEBUG: Sending SMS to {phone_number}: {message}")
        # async with httpx.AsyncClient() as client:
        #     response = await client.post(url, json=payload)
        #     return response.status_code == 200
        return True
    except Exception as e:
        print(f"Error sending SMS: {e}")
        return False
