"""Affiliate program API — applications, tracking, creator dashboard."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import Affiliate, get_db
from gentletap.dependencies import AdminUser, CurrentAffiliate, CurrentUser
from gentletap.rate_limit import limiter
from gentletap.schemas.affiliates import (
    AffiliateApplyRequest,
    AffiliateApproveRequest,
    AffiliateAttributeRequest,
    AffiliateLoginRequest,
    AffiliatePayoutRequest,
    AffiliatePublicResponse,
    AffiliateRefreshRequest,
    AffiliateTrackClickRequest,
)
from gentletap.schemas.auth import TokenResponse
from gentletap.services import affiliates as affiliate_service
from gentletap.services.admin_security import client_ip, record_admin_action
from gentletap.services.affiliate_auth import (
    authenticate_affiliate,
    issue_affiliate_token_pair,
    rotate_affiliate_refresh_token,
)

router = APIRouter(prefix="/affiliates", tags=["affiliates"])


@router.get("/program")
def affiliate_program_info() -> dict:
    settings = get_settings()
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
            {"monthly_referred_revenue": settings.affiliate_tier2_threshold, "rate": settings.affiliate_tier2_rate},
            {"monthly_referred_revenue": settings.affiliate_tier3_threshold, "rate": settings.affiliate_tier3_rate},
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
@limiter.limit("5/minute")
def apply_affiliate(request: Request, body: AffiliateApplyRequest, db: Session = Depends(get_db)) -> dict:
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
@limiter.limit("120/minute")
def track_click(
    request: Request,
    body: AffiliateTrackClickRequest,
    db: Session = Depends(get_db),
) -> dict:
    recorded = affiliate_service.record_click(
        db,
        ref_code=body.ref_code,
        landing_path=body.landing_path,
        referrer=body.referrer,
        user_agent=request.headers.get("User-Agent"),
        ip=client_ip(request),
    )
    return {"recorded": recorded}


@router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def affiliate_login(request: Request, body: AffiliateLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    affiliate = authenticate_affiliate(db, body.email, body.password)
    if affiliate is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if affiliate.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your affiliate account is not active yet",
        )
    access, refresh = issue_affiliate_token_pair(db, affiliate)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/auth/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
def affiliate_refresh(request: Request, body: AffiliateRefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    pair = rotate_affiliate_refresh_token(db, body.refresh_token)
    if pair is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    access, refresh = pair
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.get("/me", response_model=AffiliatePublicResponse)
def affiliate_me(affiliate: CurrentAffiliate) -> Affiliate:
    return affiliate


@router.get("/dashboard")
def affiliate_dashboard(affiliate: CurrentAffiliate, db: Session = Depends(get_db)) -> dict:
    return affiliate_service.affiliate_dashboard(db, affiliate)


@router.post("/attribute")
@limiter.limit("30/minute")
def attribute_referral(
    request: Request,
    body: AffiliateAttributeRequest,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    referral = affiliate_service.attach_referral_to_user(db, user, body.ref_code)
    if referral is None:
        return {"attached": False}
    return {"attached": True, "referral_id": str(referral.id)}


# --- Admin affiliate management ---


@router.get("/admin/list")
@limiter.limit("30/minute")
def admin_list_affiliates(
    request: Request,
    admin: AdminUser,
    db: Session = Depends(get_db),
    status: str | None = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
) -> dict:
    return affiliate_service.list_affiliates_admin(db, status=status, limit=limit, offset=offset)


@router.get("/admin/{affiliate_id}")
@limiter.limit("30/minute")
def admin_affiliate_detail(
    request: Request,
    affiliate_id: UUID,
    admin: AdminUser,
    db: Session = Depends(get_db),
) -> dict:
    detail = affiliate_service.affiliate_detail_admin(db, affiliate_id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    record_admin_action(
        db,
        admin=admin,
        action="affiliate.view",
        request=request,
        metadata={"affiliate_id": str(affiliate_id)},
    )
    return detail


@router.post("/admin/{affiliate_id}/approve")
@limiter.limit("10/minute")
def admin_approve_affiliate(
    request: Request,
    affiliate_id: UUID,
    admin: AdminUser,
    db: Session = Depends(get_db),
    body: AffiliateApproveRequest | None = None,
) -> dict:
    affiliate = db.query(Affiliate).filter(Affiliate.id == affiliate_id).one_or_none()
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
    record_admin_action(
        db,
        admin=admin,
        action="affiliate.approve",
        request=request,
        metadata={
            "affiliate_id": str(affiliate_id),
            "ref_code": affiliate.ref_code,
            "commission_rate": float(affiliate.commission_rate),
        },
    )
    return {"status": "active", "ref_code": affiliate.ref_code, "commission_rate": float(affiliate.commission_rate)}


@router.post("/admin/{affiliate_id}/reject")
@limiter.limit("10/minute")
def admin_reject_affiliate(
    request: Request,
    affiliate_id: UUID,
    admin: AdminUser,
    db: Session = Depends(get_db),
) -> dict:
    affiliate = db.query(Affiliate).filter(Affiliate.id == affiliate_id).one_or_none()
    if affiliate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    affiliate.status = "rejected"
    db.commit()
    record_admin_action(
        db,
        admin=admin,
        action="affiliate.reject",
        request=request,
        metadata={"affiliate_id": str(affiliate_id)},
    )
    return {"status": "rejected"}


@router.post("/admin/{affiliate_id}/pause")
@limiter.limit("10/minute")
def admin_pause_affiliate(
    request: Request,
    affiliate_id: UUID,
    admin: AdminUser,
    db: Session = Depends(get_db),
) -> dict:
    affiliate = db.query(Affiliate).filter(Affiliate.id == affiliate_id).one_or_none()
    if affiliate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    affiliate.status = "paused"
    db.commit()
    record_admin_action(
        db,
        admin=admin,
        action="affiliate.pause",
        request=request,
        metadata={"affiliate_id": str(affiliate_id)},
    )
    return {"status": "paused"}


@router.post("/admin/{affiliate_id}/payout")
@limiter.limit("10/minute")
def admin_record_payout(
    request: Request,
    affiliate_id: UUID,
    body: AffiliatePayoutRequest,
    admin: AdminUser,
    db: Session = Depends(get_db),
) -> dict:
    try:
        payout = affiliate_service.create_payout(
            db,
            affiliate_id,
            amount=body.amount,
            method=body.method,
            reference=body.reference,
            notes=body.notes,
            allow_below_minimum=body.allow_below_minimum,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    record_admin_action(
        db,
        admin=admin,
        action="affiliate.payout",
        request=request,
        metadata={"affiliate_id": str(affiliate_id), "payout_id": str(payout.id), "amount": body.amount},
    )
    return {
        "id": str(payout.id),
        "amount": float(payout.amount),
        "status": payout.status,
        "paid_at": payout.paid_at.isoformat() if payout.paid_at else None,
    }
