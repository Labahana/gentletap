from datetime import datetime, timezone
from typing import Optional, Dict, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from app.schemas.auth import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.api.deps import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.services.plan_gating import apply_plan_quotas
from app.services.onboarding import get_or_create_onboarding
from app.services.password_reset import request_password_reset, reset_password

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name or req.email.split("@")[0].capitalize(),
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    org_name = req.organization_name or f"{user.full_name}'s Org"
    org = Organization(
        name=org_name,
        owner_user_id=user.id,
        plan="starter",
    )
    apply_plan_quotas(org)
    db.add(org)
    db.commit()
    db.refresh(org)

    db.add(
        OrganizationMember(
            org_id=org.id,
            user_id=user.id,
            role="owner",
            status="active",
            invited_email=user.email,
        )
    )
    get_or_create_onboarding(db, org.id)
    db.commit()

    access_token = create_access_token(user.id, org.id, user.email)
    refresh_token = create_refresh_token(user.id, org.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        org_id=org.id,
        org_name=org.name,
        plan=org.plan,
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    org = db.query(Organization).filter(Organization.owner_user_id == user.id).first()
    if not org:
        org = Organization(name=f"{user.full_name or 'User'}'s Org", owner_user_id=user.id, plan="starter")
        apply_plan_quotas(org)
        db.add(org)
        db.commit()
        db.refresh(org)

    access_token = create_access_token(user.id, org.id, user.email)
    refresh_token = create_refresh_token(user.id, org.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        org_id=org.id,
        org_name=org.name,
        plan=org.plan,
    )


@router.get("/google/url")
def get_google_auth_url(state: Optional[str] = "google_auth_state"):
    redirect_uri = settings.google_auth_redirect_uri or settings.google_redirect_uri
    client_id = settings.google_client_id or "MOCK_GOOGLE_CLIENT_ID"
    params = {
        "client_id": client_id,
        "response_type": "code",
        "scope": "openid email profile",
        "redirect_uri": redirect_uri,
        "prompt": "select_account",
        "state": state,
    }
    query_str = "&".join(f"{k}={v}" for k, v in params.items())
    return {"url": f"{GOOGLE_AUTH_URL}?{query_str}"}


@router.post("/google/callback", response_model=TokenResponse)
def google_auth_callback(
    code: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Authenticate or Register user via Google OAuth 2.0.
    """
    redirect_uri = settings.google_auth_redirect_uri or settings.google_redirect_uri
    email = "demo@gentletap.com"
    full_name = "Google User"

    if settings.google_client_id and not settings.google_client_id.startswith("MOCK"):
        try:
            with httpx.Client(timeout=15.0) as client:
                token_res = client.post(
                    GOOGLE_TOKEN_URL,
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": redirect_uri,
                        "client_id": settings.google_client_id,
                        "client_secret": settings.google_client_secret,
                    },
                )
                token_res.raise_for_status()
                access_token_str = token_res.json().get("access_token")

                userinfo_res = client.get(
                    GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token_str}"},
                )
                userinfo_res.raise_for_status()
                u_data = userinfo_res.json()
                email = u_data.get("email", email)
                full_name = u_data.get("name") or u_data.get("given_name") or email.split("@")[0].capitalize()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Google authentication failed: {str(e)}")

    # Check if user already exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=hash_password("google_oauth_protected_account"),
            full_name=full_name,
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    org = db.query(Organization).filter(Organization.owner_user_id == user.id).first()
    if not org:
        org = Organization(name=f"{user.full_name}'s Org", owner_user_id=user.id, plan="starter")
        apply_plan_quotas(org)
        db.add(org)
        db.commit()
        db.refresh(org)

        db.add(
            OrganizationMember(
                org_id=org.id,
                user_id=user.id,
                role="owner",
                status="active",
                invited_email=user.email,
            )
        )
        get_or_create_onboarding(db, org.id)
        db.commit()

    access_token = create_access_token(user.id, org.id, user.email)
    refresh_token = create_refresh_token(user.id, org.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        org_id=org.id,
        org_name=org.name,
        plan=org.plan,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    org_id = payload.get("org_id")

    user = db.query(User).filter(User.id == user_id).first()
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not user or not org:
        raise HTTPException(status_code=401, detail="User or organization not found")

    access_token = create_access_token(user.id, org.id, user.email)
    new_refresh_token = create_refresh_token(user.id, org.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        org_id=org.id,
        org_name=org.name,
        plan=org.plan,
    )


@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    request_password_reset(db, req.email)
    return {"message": "If an account exists for that email, we sent a password reset link."}


@router.post("/reset-password")
def reset_password_endpoint(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        reset_password(db, token=req.token, new_password=req.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"message": "Password updated. You can log in with your new password."}
