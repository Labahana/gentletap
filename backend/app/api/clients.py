from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.client import Client
from app.models.client_profile import ClientProfile
from app.schemas.client import ClientCreate, ClientUpdate, ClientOut

router = APIRouter(prefix="/clients", tags=["Clients"])


def _with_score(db: Session, client: Client) -> ClientOut:
    out = ClientOut.model_validate(client)
    profile = db.query(ClientProfile).filter(ClientProfile.client_id == client.id).first()
    out.reliability_score = profile.reliability_score if profile else None
    return out


@router.get("", response_model=List[ClientOut])
def list_clients(
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    query = db.query(Client).filter(Client.org_id == org.id)

    if q:
        query = query.filter(Client.name.ilike(f"%{q}%") | Client.email.ilike(f"%{q}%"))

    query = query.order_by(Client.name.asc())
    offset = (page - 1) * page_size
    clients = query.offset(offset).limit(page_size).all()
    return [_with_score(db, c) for c in clients]


@router.get("/{id}", response_model=ClientOut)
def get_client_detail(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    client = db.query(Client).filter(Client.id == id, Client.org_id == org.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return _with_score(db, client)


@router.post("", response_model=ClientOut)
def create_client(
    req: ClientCreate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    client = Client(
        org_id=org.id,
        name=req.name,
        email=req.email,
        phone=req.phone,
        address=req.address,
        currency=req.currency,
        meta=req.meta,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return _with_score(db, client)


@router.patch("/{id}", response_model=ClientOut)
def update_client(
    id: str,
    req: ClientUpdate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    client = db.query(Client).filter(Client.id == id, Client.org_id == org.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if req.name is not None:
        client.name = req.name
    if req.email is not None:
        client.email = req.email
    if req.phone is not None:
        client.phone = req.phone
    if req.address is not None:
        client.address = req.address
    if req.currency is not None:
        client.currency = req.currency
    if req.meta is not None:
        client.meta = req.meta

    db.commit()
    db.refresh(client)
    return _with_score(db, client)
