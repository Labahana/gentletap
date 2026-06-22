from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from gentletap.database import Client, get_db
from gentletap.dependencies import CurrentUser
from gentletap.plans import has_whatsapp
from gentletap.integrations.twilio.phone import normalize_phone_e164
from gentletap.services.clients_data import client_detail, list_clients

router = APIRouter(prefix="/clients", tags=["clients"])


class ClientUpdateBody(BaseModel):
    email: str | None = None
    phone: str | None = None


@router.get("")
def get_clients(
    user: CurrentUser,
    db: Session = Depends(get_db),
    limit: int = Query(100, le=200),
    offset: int = Query(0, ge=0),
) -> dict:
    return list_clients(db, user.id, limit=limit, offset=offset)


@router.get("/{client_id}")
def get_client(client_id: UUID, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    row = client_detail(db, user.id, client_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return row


@router.patch("/{client_id}")
def update_client(
    client_id: UUID,
    body: ClientUpdateBody,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    client = (
        db.query(Client)
        .filter(Client.id == client_id, Client.user_id == user.id)
        .one_or_none()
    )
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    if body.email is not None:
        email = body.email.strip()
        if not email or "@" not in email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid email address")
        client.email = email[:320]

    if body.phone is not None:
        if not has_whatsapp(user.plan):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="WhatsApp is available on Pro+ and Team plans only",
            )
        stripped = body.phone.strip()
        if not stripped:
            client.phone = None
        else:
            normalized = normalize_phone_e164(stripped)
            if not normalized:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Enter a valid mobile number with country code",
                )
            client.phone = normalized

    db.commit()
    row = client_detail(db, user.id, client_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return row
