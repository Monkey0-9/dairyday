"""Payment schemas for DairyDay API.

Includes UTR payment submission and verification schemas.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PaymentResponse(BaseModel):
    """Response schema for payment records including UTR payments."""
    
    id: UUID
    bill_id: UUID
    user_id: Optional[UUID] = None
    amount: float
    status: str
    
    # UTR fields
    utr_number: Optional[str] = None
    payment_method: Optional[str] = None
    screenshot_url: Optional[str] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    # Timestamps
    submitted_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    
    # Metadata
    message: Optional[str] = None
    
    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    """Schema for creating a new payment."""
    
    bill_id: UUID
    amount: float = Field(..., gt=0)
    payment_method: str = Field(default="razorpay")
    provider_payment_id: Optional[str] = None


class PaymentVerify(BaseModel):
    """Schema for verifying a payment (admin only)."""
    
    approved: bool
    reason: Optional[str] = Field(None, max_length=500)
