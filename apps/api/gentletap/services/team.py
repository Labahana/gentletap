"""Team seats: invites, membership, and role checks.

Roles: owner > member > viewer. Members can manage automation/invoices; viewers are read-only.
Billing + team management is owner-only.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.database import Profile, TeamInvite, TeamMember

ROLE_RANK = {"viewer": 0, "member": 1, "owner": 2}

INVITE_TTL = timedelta(days=7)


def account_id_for(user: Profile) -> UUID:
    return user.account_owner_id or user.id


def role_for(user: Profile) -> str:
    return user.account_role if user.account_role in ROLE_RANK else "owner"


def require_role(user: Profile, minimum: str) -> None:
    from fastapi import HTTPException, status

    if ROLE_RANK.get(role_for(user), 0) < ROLE_RANK.get(minimum, 0):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires {minimum} role on this account",
        )


def list_members(db: Session, account_id: UUID) -> list[dict]:
    rows = (
        db.query(TeamMember, Profile)
        .join(Profile, Profile.id == TeamMember.user_id)
        .filter(TeamMember.account_id == account_id)
        .all()
    )
    return [
        {
            "id": str(m.id),
            "user_id": str(m.user_id),
            "email": p.email,
            "full_name": p.full_name,
            "role": m.role,
            "invited_via": m.invited_via,
        }
        for m, p in rows
    ]


def list_invites(db: Session, account_id: UUID) -> list[dict]:
    rows = (
        db.query(TeamInvite)
        .filter(TeamInvite.account_id == account_id, TeamInvite.status == "pending")
        .order_by(TeamInvite.created_at.desc())
        .all()
    )
    return [
        {
            "id": str(i.id),
            "email": i.email,
            "role": i.role,
            "expires_at": i.expires_at.isoformat() if i.expires_at else None,
        }
        for i in rows
    ]


def create_invite(db: Session, *, account: Profile, inviter: Profile, email: str, role: str) -> tuple[TeamInvite, str]:
    email = email.strip().lower()
    if role not in ("member", "viewer"):
        raise ValueError("Role must be member or viewer")
    token = secrets.token_urlsafe(32)
    invite = TeamInvite(
        account_id=account.id,
        email=email,
        role=role,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        invited_by_id=inviter.id,
        expires_at=datetime.now(UTC) + INVITE_TTL,
    )
    db.add(invite)
    db.flush()
    return invite, token


def accept_invite(db: Session, *, user: Profile, token: str) -> TeamMember | None:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    invite = (
        db.query(TeamInvite)
        .filter(TeamInvite.token_hash == token_hash, TeamInvite.status == "pending")
        .one_or_none()
    )
    if invite is None:
        return None
    if invite.expires_at.tzinfo is None:
        invite.expires_at = invite.expires_at.replace(tzinfo=UTC)
    if invite.expires_at < datetime.now(UTC):
        invite.status = "expired"
        db.flush()
        return None
    if invite.email.lower() != user.email.lower():
        return None

    invite.status = "accepted"
    invite.accepted_by_id = user.id
    invite.accepted_at = datetime.now(UTC)

    member = (
        db.query(TeamMember)
        .filter(TeamMember.account_id == invite.account_id, TeamMember.user_id == user.id)
        .one_or_none()
    )
    if member is None:
        member = TeamMember(
            account_id=invite.account_id,
            user_id=user.id,
            role=invite.role,
            invited_via="invite",
        )
        db.add(member)
    else:
        member.role = invite.role

    user.account_owner_id = invite.account_id
    user.account_role = invite.role
    db.flush()
    return member


def remove_member(db: Session, *, account_id: UUID, user_id: UUID) -> bool:
    member = (
        db.query(TeamMember)
        .filter(TeamMember.account_id == account_id, TeamMember.user_id == user_id)
        .one_or_none()
    )
    if member is None:
        return False
    db.delete(member)
    user = db.query(Profile).filter(Profile.id == user_id).one_or_none()
    if user is not None and user.account_owner_id == account_id:
        user.account_owner_id = None
        user.account_role = "owner"
    db.flush()
    return True
