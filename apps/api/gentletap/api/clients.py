from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from gentletap.database import get_db
from gentletap.dependencies import CurrentUser
from gentletap.services.clients_data import client_detail, list_clients

router = APIRouter(prefix="/clients", tags=["clients"])


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
