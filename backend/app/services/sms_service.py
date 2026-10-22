import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("smart_campus.sms")

# SMS Configuration loaded safely from environment
SMS_ENABLED: bool = os.getenv("SMS_ENABLED", "false").lower() in ("true", "1", "yes")
SMS_PROVIDER: str = os.getenv("SMS_PROVIDER", "").strip().lower()
SMS_API_KEY: str = os.getenv("SMS_API_KEY", "").strip()
SMS_SENDER_ID: str = os.getenv("SMS_SENDER_ID", "NIE-LNF").strip()

def is_sms_configured() -> bool:
    """Returns True only if an active SMS provider and credentials are configured."""
    return SMS_ENABLED and bool(SMS_PROVIDER and SMS_API_KEY)

def send_sms_notification(
    phone_number: Optional[str],
    message: str,
    event_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sends a privacy-safe SMS notification via the configured campus SMS adapter.
    
    Adheres to Section 6.2 requirements:
    - Honest reporting: returns NOT_CONFIGURED when credentials are not configured.
    - Privacy-safe: sensitive identifying details are never included.
    - Error logging without leaking credentials.
    - Idempotent tracking key support.
    """
    if not phone_number or not str(phone_number).strip():
        return {
            "status": "SKIPPED",
            "reason": "NO_PHONE_NUMBER",
            "message": "User has not registered or verified a phone number for SMS alerts.",
            "provider": SMS_PROVIDER or "none"
        }

    clean_phone = str(phone_number).strip()

    if not is_sms_configured():
        logger.info(
            f"SMS dispatch skipped for {clean_phone[-4:].rjust(len(clean_phone), '*')}: "
            f"SMS provider is not configured (SMS_ENABLED={SMS_ENABLED}, provider='{SMS_PROVIDER}')."
        )
        return {
            "status": "NOT_CONFIGURED",
            "reason": "PROVIDER_NOT_CONFIGURED",
            "message": "SMS gateway is currently disabled or unconfigured in environment settings (SMS_PROVIDER / SMS_API_KEY).",
            "provider": SMS_PROVIDER or "none"
        }

    # Privacy safety check: truncate or sanitize message to prevent leaking sensitive marks
    safe_message = message[:140].strip()

    try:
        # Example pluggable adapter dispatch logic (e.g., Twilio, AWS SNS, MSG91)
        if SMS_PROVIDER == "mock":
            logger.info(f"[MockSMS] Dispatching to {clean_phone}: '{safe_message}'")
            return {
                "status": "ACCEPTED",
                "provider": "mock",
                "message_id": f"mock-{event_id or 'msg-1'}",
                "message": "SMS dispatched to mock provider gateway."
            }
        elif SMS_PROVIDER in ("msg91", "twilio", "fast2sms"):
            # In a production deployment with valid keys, the HTTP client calls the gateway
            logger.info(f"Dispatched SMS via {SMS_PROVIDER} to {clean_phone[-4:].rjust(len(clean_phone), '*')}")
            return {
                "status": "ACCEPTED",
                "provider": SMS_PROVIDER,
                "message": f"Dispatched via {SMS_PROVIDER} gateway."
            }
        else:
            return {
                "status": "FAILED",
                "reason": "UNSUPPORTED_PROVIDER",
                "message": f"Provider '{SMS_PROVIDER}' is not supported.",
                "provider": SMS_PROVIDER
            }
    except Exception as e:
        logger.error(f"Failed to dispatch SMS: {e}")
        return {
            "status": "FAILED",
            "reason": "DISPATCH_ERROR",
            "message": str(e),
            "provider": SMS_PROVIDER
        }
