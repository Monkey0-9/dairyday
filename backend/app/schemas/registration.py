
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class RegistrationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class RegistrationCreate(RegistrationBase):
    password: str = Field(..., min_length=8)


class RegistrationUpdate(BaseModel):
    status: str = Field(..., pattern="^(VERIFYING|PENDING|APPROVED|REJECTED)$")


class RegistrationOTPVerify(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)


class RegistrationResendOTP(BaseModel):
    email: EmailStr


class RegistrationRequest(RegistrationBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    created_at: datetime
