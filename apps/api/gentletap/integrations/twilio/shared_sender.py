"""GentleTap shared WhatsApp sender (one platform number for all Pro+ users).

Production setup (Twilio Console):
1. Upgrade Twilio account (trial cannot register production WhatsApp senders).
2. Messaging → Senders → WhatsApp — register a number until status is ONLINE.
3. Messaging → Content Template Builder — submit utility templates (see templates.py),
   then set TWILIO_WHATSAPP_CONTENT_SID_* env vars.
4. On the WhatsApp sender, set webhooks:
   - Inbound:  {API_URL}/v1/webhooks/twilio/whatsapp
   - Status:   {API_URL}/v1/webhooks/twilio/whatsapp/status
5. Set TWILIO_WHATSAPP_FROM=whatsapp:+E164 (must match registered sender).

Sandbox testing: use TWILIO_WHATSAPP_FROM=whatsapp:+14155238886 and join the sandbox
from each test handset (participants re-join every 3 days).

Docs: https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates
"""

from gentletap.config import Settings, get_settings


def inbound_webhook_url(settings: Settings | None = None) -> str:
    cfg = settings or get_settings()
    return f"{cfg.api_url.rstrip('/')}/v1/webhooks/twilio/whatsapp"


def status_webhook_url(settings: Settings | None = None) -> str:
    cfg = settings or get_settings()
    return f"{cfg.api_url.rstrip('/')}/v1/webhooks/twilio/whatsapp/status"


def platform_webhook_config(settings: Settings | None = None) -> dict:
    """Webhook URLs to paste into Twilio Console for the shared sender."""
    cfg = settings or get_settings()
    return {
        "inbound_url": inbound_webhook_url(cfg),
        "status_url": status_webhook_url(cfg),
        "from_number": (cfg.twilio_whatsapp_from or "").strip() or None,
    }
