"""Team seats & invites."""

from datetime import datetime, timedelta, timezone
from typing import List, Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.api.deps import get_current_user_and_org, hash_password, create_access_token
from app.models.organization_member import OrganizationMember
from app.models.user import User
from app.models.organization import Organization
from app.services.email import send_email_via_resend
from app.services.plan_gating import can_add_team_member, normalize_plan, require_owner

router = APIRouter(prefix="/team", tags=["Team"])
settings = get_settings()


class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "member"


class AcceptInviteRequest(BaseModel):
    token: str
    password: Optional[str] = None
    full_name: Optional[str] = None


class RoleUpdate(BaseModel):
    role: str


def _member_out(m: OrganizationMember, user: Optional[User] = None) -> dict:
    return {
        "id": m.id,
        "org_id": m.org_id,
        "user_id": m.user_id,
        "role": m.role,
        "invited_email": m.invited_email,
        "status": m.status,
        "email": (user.email if user else m.invited_email),
        "full_name": (user.full_name if user else None),
        "created_at": m.created_at,
    }


@router.get("")
def list_team(user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    _, org = user_and_org
    members = db.query(OrganizationMember).filter(OrganizationMember.org_id == org.id).all()
    # Ensure owner row exists
    owner_row = next((m for m in members if m.role == "owner" and m.status == "active"), None)
    if not owner_row:
        owner_row = OrganizationMember(
            org_id=org.id,
            user_id=org.owner_user_id,
            role="owner",
            status="active",
            invited_email=None,
        )
        db.add(owner_row)
        db.commit()
        db.refresh(owner_row)
        members = db.query(OrganizationMember).filter(OrganizationMember.org_id == org.id).all()

    out = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first() if m.user_id else None
        out.append(_member_out(m, u))
    active = sum(1 for m in members if m.status in ("active", "pending"))
    return {
        "members": out,
        "seats_used": active,
        "seats_limit": org.seats_limit,
        "plan": normalize_plan(org.plan),
    }


@router.post("/invite")
def invite_member(
    req: InviteRequest,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    require_owner(user, org)
    if normalize_plan(org.plan) != "team":
        raise HTTPException(status_code=403, detail="Upgrade to Team to invite members.")
    if not can_add_team_member(org, db):
        raise HTTPException(status_code=403, detail="Seat limit reached.")

    email = req.email.lower()
    existing = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.org_id == org.id, OrganizationMember.invited_email == email)
        .first()
    )
    if existing and existing.status == "active":
        raise HTTPException(status_code=400, detail="User already a member")

    member = existing or OrganizationMember(
        org_id=org.id,
        invited_email=email,
        role="member" if req.role != "owner" else "member",
        status="pending",
    )
    if existing:
        member.status = "pending"
    else:
        db.add(member)
    db.flush()

    token = jwt.encode(
        {
            "org_id": org.id,
            "member_id": member.id,
            "email": email,
            "purpose": "team_invite",
            "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        },
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    link = f"{settings.frontend_url}/team/accept?token={token}"
    send_email_via_resend(
        email,
        f"You're invited to {org.name} on GentleTap",
        f"Hi,\n\n{user.full_name or user.email} invited you to join {org.name} on GentleTap.\n\n"
        f"Accept invite: {link}\n\nThis link expires in 24 hours.\n\n— GentleTap",
    )
    db.commit()
    return {"status": "invited", "member_id": member.id, "invite_link": link}


@router.post("/invite/accept")
def accept_invite(req: AcceptInviteRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(req.token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired invite token")
    if payload.get("purpose") != "team_invite":
        raise HTTPException(status_code=400, detail="Invalid token")

    member = db.query(OrganizationMember).filter(OrganizationMember.id == payload["member_id"]).first()
    if not member or member.status == "active":
        raise HTTPException(status_code=400, detail="Invite not found or already accepted")

    email = payload["email"].lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        if not req.password:
            raise HTTPException(status_code=400, detail="Password required to create account")
        user = User(
            email=email,
            password_hash=hash_password(req.password),
            full_name=req.full_name or email.split("@")[0],
        )
        db.add(user)
        db.flush()

    member.user_id = user.id
    member.status = "active"
    member.invited_email = email
    db.commit()

    token = create_access_token(user.id, member.org_id, user.email)
    return {"access_token": token, "org_id": member.org_id, "user_id": user.id}


@router.delete("/{member_id}")
def remove_member(
    member_id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    require_owner(user, org)
    member = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.id == member_id, OrganizationMember.org_id == org.id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "owner" or member.user_id == org.owner_user_id:
        raise HTTPException(status_code=400, detail="Cannot remove the owner")
    db.delete(member)
    db.commit()
    return {"status": "removed"}


@router.patch("/{member_id}")
def update_member_role(
    member_id: str,
    req: RoleUpdate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    require_owner(user, org)
    if req.role not in ("owner", "member"):
        raise HTTPException(status_code=400, detail="Invalid role")
    member = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.id == member_id, OrganizationMember.org_id == org.id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if req.role == "owner":
        # transfer ownership
        old_owner = (
            db.query(OrganizationMember)
            .filter(OrganizationMember.org_id == org.id, OrganizationMember.role == "owner")
            .first()
        )
        if old_owner:
            old_owner.role = "member"
        member.role = "owner"
        if member.user_id:
            org.owner_user_id = member.user_id
    else:
        member.role = "member"
    db.commit()
    return {"status": "updated", "role": member.role}
