from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr


class ClientCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    currency: str = "USD"
    meta: Optional[Dict[str, Any]] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    currency: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


class ClientOut(BaseModel):
    id: str
    org_id: str
    external_client_id: Optional[str] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    currency: str
    relationship_started_at: Optional[datetime] = None
    meta: Optional[Dict[str, Any]] = None
    created_at: datetime
    reliability_score: Optional[int] = None

    class Config:
        from_attributes = True
