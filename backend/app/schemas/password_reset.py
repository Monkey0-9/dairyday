from pydantic import BaseModel
from uuid import UUID
import datetime
from typing import Optional


class PasswordResetRequestBase(BaseModel):
    user_id: UUID


class PasswordResetRequestCreate(PasswordResetRequestBase):
    request_ip: Optional[str] = None


class PasswordResetRequestUpdate(BaseModel):
    status: str
    admin_id: Optional[UUID] = None


class PasswordResetRequestResponse(PasswordResetRequestBase):
    id: UUID
    status: str
    created_at: datetime.datetime
    approved_at: Optional[datetime.datetime] = None
    expires_at: Optional[datetime.datetime] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_phone: Optional[str] = None

    class Config:
        from_attributes = True
