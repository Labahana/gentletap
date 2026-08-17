from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ConnectionOut(BaseModel):
    id: str
    org_id: str
    provider: str
    realm_id: Optional[str] = None
    account_id: Optional[str] = None
    status: str
    last_sync_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SyncResponse(BaseModel):
    message: str
    invoices_synced: int
    clients_synced: int
