from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class SupportTicketBase(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    subject: str = Field(..., min_length=5)
    message: str = Field(..., min_length=10)


class SupportTicketCreate(SupportTicketBase):
    pass


class SupportTicketUpdate(BaseModel):
    status: Optional[str] = None  # OPEN, IN_PROGRESS, RESOLVED, CLOSED


class SupportTicket(SupportTicketBase):
    id: UUID
    user_id: Optional[UUID] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
