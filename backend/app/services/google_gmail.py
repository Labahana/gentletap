import base64
import logging
from email.mime.text import MIMEText
from typing import Dict, Any, Tuple, Optional
import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.connection import Connection

logger = logging.getLogger(__name__)
settings = get_settings()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"

GOOGLE_GMAIL_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
]


def get_google_gmail_auth_url(state: str) -> str:
    scope_str = " ".join(GOOGLE_GMAIL_SCOPES)
    redirect_uri = settings.google_redirect_uri or settings.google_auth_redirect_uri
    params = {
        "client_id": settings.google_client_id or "MOCK_GOOGLE_CLIENT_ID",
        "response_type": "code",
        "scope": scope_str,
        "redirect_uri": redirect_uri,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    query_str = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GOOGLE_AUTH_URL}?{query_str}"


def exchange_google_code(code: str) -> Dict[str, Any]:
    redirect_uri = settings.google_redirect_uri or settings.google_auth_redirect_uri
    if not settings.google_client_id or settings.google_client_id.startswith("MOCK"):
        return {
            "access_token": "mock_google_access_token",
            "refresh_token": "mock_google_refresh_token",
            "expires_in": 3600,
            "email": "user@gmail.com",
        }

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
    }
    with httpx.Client(timeout=15.0) as client:
        response = client.post(GOOGLE_TOKEN_URL, data=data)
        response.raise_for_status()
        token_data = response.json()

        # Fetch connected Google Email
        headers = {"Authorization": f"Bearer {token_data.get('access_token')}"}
        user_res = client.get(GOOGLE_USERINFO_URL, headers=headers)
        email = "user@gmail.com"
        if user_res.status_code == 200:
            email = user_res.json().get("email", email)

        token_data["email"] = email
        return token_data


def refresh_google_access_token(refresh_token: str) -> str:
    if not settings.google_client_id or settings.google_client_id.startswith("MOCK"):
        return "mock_google_access_token"

    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
    }
    with httpx.Client(timeout=15.0) as client:
        response = client.post(GOOGLE_TOKEN_URL, data=data)
        response.raise_for_status()
        return response.json().get("access_token", "")


def send_email_via_gmail(
    access_token: str,
    refresh_token: str,
    to_email: str,
    subject: str,
    body: str,
    sender_email: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Send email via Gmail REST API using connected user's OAuth tokens.
    """
    if access_token == "mock_google_access_token" or not settings.google_client_id:
        logger.info(f"[MOCK GMAIL SENT] To: {to_email} | Subject: {subject} | Sender: {sender_email}")
        return {
            "id": f"mock_gmail_msg_{to_email.replace('@', '_')}",
            "status": "sent",
            "provider": "gmail",
        }

    # Ensure access token is fresh
    active_token = access_token
    if refresh_token:
        try:
            active_token = refresh_google_access_token(refresh_token)
        except Exception as err:
            logger.warning(f"Google token refresh failed: {err}, falling back to current token")

    # Build MIME message
    mime_msg = MIMEText(body, "plain", "utf-8")
    mime_msg["to"] = to_email
    mime_msg["subject"] = subject
    if sender_email:
        mime_msg["from"] = sender_email

    raw_string = base64.urlsafe_b64encode(mime_msg.as_bytes()).decode("utf-8")

    headers = {
        "Authorization": f"Bearer {active_token}",
        "Content-Type": "application/json",
    }
    payload = {"raw": raw_string}

    with httpx.Client(timeout=15.0) as client:
        response = client.post(GMAIL_SEND_URL, headers=headers, json=payload)
        response.raise_for_status()
        res_data = response.json()
        return {
            "id": res_data.get("id"),
            "status": "sent",
            "provider": "gmail",
        }
