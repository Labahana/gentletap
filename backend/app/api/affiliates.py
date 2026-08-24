"""Affiliate program API — applications, tracking, creator dashboard."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.api.admin import require_admin_flexible
from app.models.affiliate import Affiliate
from app.schemas.affiliates import (
    AffiliateApplyRequest,
    AffiliateApproveRequest,
    AffiliateAttributeRequest,
    AffiliateLoginRequest,
    AffiliatePayoutRequest,
    AffiliatePublicResponse,
    AffiliateRefreshRequest,
    AffiliateTokenResponse,
    AffiliateTrackClickRequest,
)
from app.services import affiliates as affiliate_service
from app.services.affiliate_auth import (
    authenticate_affiliate,
    get_affiliate_from_token,
    issue_affiliate_token_pair,
    rotate_affiliate_refresh_token,
)

router = APIRouter(prefix="/affiliates", tags=["Affiliates"])
settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def _client_ip(request: Request) -> Optional[str]:
    if settings.trust_proxy_headers:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
    return request.client.host if request.client else None


def current_affiliate(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Affiliate:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    affiliate = get_affiliate_from_token(db, token)
    if affiliate is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return affiliate


@router.get("/program")
def affiliate_program_info() -> dict:
    months = settings.affiliate_commission_months
    discount_pct = int(settings.affiliate_referral_discount_percent * 100)
    discount_months = settings.affiliate_referral_discount_months
    first_month_pct = int(settings.affiliate_first_month_rate * 100)
    base_pct = int(settings.affiliate_default_commission_rate * 100)
    return {
        "commission_rate": settings.affiliate_default_commission_rate,
        "first_month_rate": settings.affiliate_first_month_rate,
        "commission_type": "hybrid_recurring_limited",
        "commission_months": months,
        "cookie_days": settings.affiliate_cookie_days,
        "payout_methods": list(affiliate_service.PAYOUT_METHODS),
        "payout_minimum": settings.affiliate_payout_minimum,
        "performance_tiers": [
            {"monthly_referred_revenue": 0, "rate": settings.affiliate_default_commission_rate},
            {
                "monthly_referred_revenue": settings.affiliate_tier2_threshold,
                "rate": settings.affiliate_tier2_rate,
            },
            {
                "monthly_referred_revenue": settings.affiliate_tier3_threshold,
                "rate": settings.affiliate_tier3_rate,
            },
        ],
        "referral_discount_percent": discount_pct,
        "referral_discount_months": discount_months,
        "referral_discount_active": bool(
            discount_pct > 0
            and discount_months > 0
            and settings.paddle_discount_id_affiliate_referral.strip()
        ),
        "description": (
            f"Earn {first_month_pct}% of each referral's first month plus {base_pct}% of every "
            f"subscription payment for {months} months per referred customer."
        ),
        "audience_offer": (
            f"{discount_pct}% off first {discount_months} months for customers who use an affiliate link"
            if discount_pct > 0 and discount_months > 0
            else None
        ),
    }


@router.post("/apply", status_code=status.HTTP_201_CREATED)
def apply_affiliate(body: AffiliateApplyRequest, db: Session = Depends(get_db)) -> dict:
    try:
        affiliate = affiliate_service.create_affiliate_application(
            db,
            email=body.email,
            password=body.password,
            name=body.name,
            channel_name=body.channel_name,
            channel_url=body.channel_url,
            payout_email=str(body.payout_email) if body.payout_email else None,
            application_note=body.application_note,
            partner_type=body.partner_type,
            payout_method=body.payout_method,
            payout_details=body.payout_details,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return {
        "status": "pending",
        "message": "Application received. We'll email you when approved.",
        "affiliate_id": str(affiliate.id),
    }


@router.post("/track-click")
def track_click(request: Request, body: AffiliateTrackClickRequest, db: Session = Depends(get_db)) -> dict:
    recorded = affiliate_service.record_click(
        db,
        ref_code=body.ref_code,
        landing_path=body.landing_path,
        referrer=body.referrer,
        user_agent=request.headers.get("User-Agent"),
        ip=_client_ip(request),
    )
    return {"recorded": recorded}


@router.post("/auth/login", response_model=AffiliateTokenResponse)
def affiliate_login(body: AffiliateLoginRequest, db: Session = Depends(get_db)) -> AffiliateTokenResponse:
    affiliate = authenticate_affiliate(db, body.email, body.password)
    if affiliate is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if affiliate.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your affiliate account is not active yet",
        )
    access, refresh = issue_affiliate_token_pair(db, affiliate)
    return AffiliateTokenResponse(access_token=access, refresh_token=refresh)


@router.post("/auth/refresh", response_model=AffiliateTokenResponse)
def affiliate_refresh(body: AffiliateRefreshRequest, db: Session = Depends(get_db)) -> AffiliateTokenResponse:
    pair = rotate_affiliate_refresh_token(db, body.refresh_token)
    if pair is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    access, refresh = pair
    return AffiliateTokenResponse(access_token=access, refresh_token=refresh)


@router.get("/me", response_model=AffiliatePublicResponse)
def affiliate_me(affiliate: Affiliate = Depends(current_affiliate)) -> Affiliate:
    return affiliate


@router.get("/dashboard")
def affiliate_dashboard(
    affiliate: Affiliate = Depends(current_affiliate), db: Session = Depends(get_db)
) -> dict:
    return affiliate_service.affiliate_dashboard(db, affiliate)


@router.post("/attribute")
def attribute_referral(
    body: AffiliateAttributeRequest,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
) -> dict:
    _, org = user_and_org
    referral = affiliate_service.attach_referral_to_org(db, org, body.ref_code)
    if referral is None:
        return {"attached": False}
    return {"attached": True, "referral_id": str(referral.id)}


# --- Admin affiliate management (API-only; X-Admin-Api-Key gated) ---


@router.get("/admin/list")
def admin_list_affiliates(
    _: bool = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
) -> dict:
    return affiliate_service.list_affiliates_admin(
        db, status=status_filter, limit=limit, offset=offset
    )


@router.get("/admin/{affiliate_id}")
def admin_affiliate_detail(
    affiliate_id: UUID,
    _: bool = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
) -> dict:
    detail = affiliate_service.affiliate_detail_admin(db, str(affiliate_id))
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return detail


@router.post("/admin/{affiliate_id}/approve")
def admin_approve_affiliate(
    affiliate_id: UUID,
    _: bool = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
    body: Optional[AffiliateApproveRequest] = None,
) -> dict:
    affiliate = db.query(Affiliate).filter(Affiliate.id == str(affiliate_id)).one_or_none()
    if affiliate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    ref_code = body.ref_code if body else None
    commission_rate = body.commission_rate if body else None
    try:
        affiliate = affiliate_service.approve_affiliate(
            db, affiliate, ref_code=ref_code, commission_rate=commission_rate
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {
        "status": "active",
        "ref_code": affiliate.ref_code,
        "commission_rate": float(affiliate.commission_rate),
    }


@router.post("/admin/{affiliate_id}/reject")
def admin_reject_affiliate(
    affiliate_id: UUID,
    _: bool = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
) -> dict:
    affiliate = db.query(Affiliate).filter(Affiliate.id == str(affiliate_id)).one_or_none()
    if affiliate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    affiliate.status = "rejected"
    db.commit()
    return {"status": "rejected"}


@router.post("/admin/{affiliate_id}/pause")
def admin_pause_affiliate(
    affiliate_id: UUID,
    _: bool = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
) -> dict:
    affiliate = db.query(Affiliate).filter(Affiliate.id == str(affiliate_id)).one_or_none()
    if affiliate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    affiliate.status = "paused"
    db.commit()
    return {"status": "paused"}


@router.post("/admin/{affiliate_id}/payout")
def admin_record_payout(
    affiliate_id: UUID,
    body: AffiliatePayoutRequest,
    _: bool = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
) -> dict:
    try:
        payout = affiliate_service.create_payout(
            db,
            str(affiliate_id),
            amount=body.amount,
            method=body.method,
            reference=body.reference,
            notes=body.notes,
            allow_below_minimum=body.allow_below_minimum,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {
        "id": str(payout.id),
        "amount": float(payout.amount),
        "status": payout.status,
        "paid_at": payout.paid_at.isoformat() if payout.paid_at else None,
    }
