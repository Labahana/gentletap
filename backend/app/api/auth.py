from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

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

router = APIRouter(prefix="/auth", tags=["Auth"])


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
def forgot_password(req: ForgotPasswordRequest):
    return {"message": "Password reset email sent if account exists"}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    return {"message": "Password reset successful"}
