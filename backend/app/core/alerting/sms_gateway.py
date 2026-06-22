"""
sms_gateway.py
==============
SMS dispatch layer for Chikwawa Flood Risk System.

CURRENT STATUS: SIMULATION MODE (real delivery ready — see setup below)

GATEWAY: Textbee.dev — Free Android SMS Gateway
  Uses a personal Android phone with a Malawi SIM card to send real SMS.
  The Textbee cloud relays messages to your phone app, which sends via your SIM.

  SETUP (one-time — ~10 minutes):
  ─────────────────────────────────────────────────────
  1. Register free at https://textbee.dev
  2. Install "TextBee - SMS Gateway" on your Android phone (Google Play)
     Play Store: https://play.google.com/store/apps/details?id=com.vernu.sms
  3. Sign in to the app with your Textbee account → tap "Register Device"
  4. From the Textbee dashboard get:
       - Your DEVICE ID  (shown under Devices)
       - An API KEY      (Profile → API Keys → Generate)
  5. Add to backend/.env:
       TEXTBEE_API_KEY=your_api_key_here
       TEXTBEE_DEVICE_ID=your_device_id_here
  6. Set SIMULATION_MODE = False below
  7. Restart the backend → real SMS will be sent on next broadcast

  HOW IT WORKS:
  ─────────────────────────────────────────────────────
  Backend → POST api.textbee.dev → TextBee cloud → Android app → Airtel/TNM → Recipient

  IN SIMULATION MODE:
  - All SMS are logged to the DB exactly as if sent (full audit trail)
  - The dispatch flow (human approval → log → feed) is fully functional
  - Only the actual network call to the carrier is skipped
"""

import os
import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# ─── Flip to False once your Textbee credentials are in .env ──────────────────
SIMULATION_MODE = False
# ──────────────────────────────────────────────────────────────────────────────

TEXTBEE_API_BASE = "https://api.textbee.dev/api/v1/gateway/devices"


def _get_env(attr: str, env_key: str) -> str:
    """Read a setting from the Pydantic settings object or fall back to os.getenv."""
    return getattr(settings, attr, None) or os.getenv(env_key, "")


async def send_sms_alert(phone_number: str, message: str) -> bool:
    """
    Dispatch an SMS alert to a single recipient.

    In SIMULATION_MODE the call always succeeds and is logged.
    With SIMULATION_MODE = False, the message is relayed through the Textbee
    cloud to the registered Android phone, which sends it via its SIM card.

    Args:
        phone_number: Recipient in E.164 format, e.g. +265888123456
        message:      The alert text to send

    Returns:
        True if the message was accepted/queued, False on failure.
    """

    # ── SIMULATION MODE ───────────────────────────────────────────────────────
    if SIMULATION_MODE:
        logger.info(f"[SMS SIMULATION] → {phone_number}: {message[:80]}")
        print(f"📱 [SIMULATED SMS] To: {phone_number} | Msg: {message[:80]}")
        return True

    # ── TEXTBEE ANDROID SMS GATEWAY ───────────────────────────────────────────
    api_key   = _get_env("TEXTBEE_API_KEY",   "TEXTBEE_API_KEY")
    device_id = _get_env("TEXTBEE_DEVICE_ID", "TEXTBEE_DEVICE_ID")

    if not api_key or not device_id:
        logger.error(
            "Textbee not configured. "
            "Set TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID in backend/.env, "
            "then set SIMULATION_MODE = False in sms_gateway.py"
        )
        return False

    url = f"{TEXTBEE_API_BASE}/{device_id}/send-sms"
    payload = {
        "recipients": [phone_number],
        "message":    message,
    }
    headers = {
        "Content-Type": "application/json",
        "x-api-key":    api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=payload, headers=headers)

        if response.status_code in (200, 201):
            data = response.json()
            logger.info(f"[SMS SENT via Textbee] → {phone_number} | Response: {data}")
            return True
        else:
            logger.error(
                f"[SMS GATEWAY] Textbee HTTP {response.status_code}: "
                f"{response.text[:300]}"
            )
            return False

    except httpx.TimeoutException:
        logger.error(f"[SMS GATEWAY] Timeout sending to {phone_number} via Textbee")
        return False
    except Exception as e:
        logger.error(f"[SMS GATEWAY] Unexpected error: {e}")
        return False
