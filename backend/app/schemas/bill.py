from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
from uuid import UUID
import datetime
from decimal import Decimal
import re


class BillStatus:
    """Bill status constants."""
    UNPAID = "UNPAID"
    PAID = "PAID"


class BillBase(BaseModel):
    """Base bill schema."""
    model_config = ConfigDict(from_attributes=True)

    month: str = Field(
        ...,
        pattern=r"^\d{4}-(0[1-9]|1[0-2])$",
        description="Billing period in YYYY-MM format"
    )
    total_liters: Decimal = Field(
        ...,
        ge=0,
        le=100000,
        description="Total liters consumed"
    )
    total_amount: Decimal = Field(
        ...,
        ge=0,
        le=10000000,
        description="Total amount in INR"
    )
    status: str = Field(
        default=BillStatus.UNPAID,
        description="Bill status"
    )
    pdf_url: Optional[str] = Field(
        None,
        description="URL to the PDF invoice"
    )
    is_locked: bool = Field(
        default=False,
        description="Whether the bill is finalized and locked"
    )
    generated_at: Optional[datetime.datetime] = None


class BillCreate(BaseModel):
    """Schema for creating a bill."""
    model_config = ConfigDict(populate_by_name=True)

    user_id: UUID = Field(
        ...,
        description="ID of the user"
    )
    month: str = Field(
        ...,
        pattern=r"^\d{4}-(0[1-9]|1[0-2])$",
        description="Billing period in YYYY-MM format"
    )

    @field_validator('month')
    @classmethod
    def validate_month_format(cls, v: str) -> str:
        """Validate month format."""
        if not re.match(r"^\d{4}-(0[1-9]|1[0-2])$", v):
            raise ValueError("Month must be in YYYY-MM format")
        return v


class BillUpdate(BaseModel):
    """Schema for updating a bill."""
    model_config = ConfigDict(populate_by_name=True)

    status: Optional[str] = Field(
        None,
        pattern=f"^({BillStatus.UNPAID}|{BillStatus.PAID})$",
        description="Bill status"
    )
    pdf_url: Optional[str] = None


class BillInDBBase(BillBase):
    """Base schema for bill in database."""
    id: UUID
    user_id: UUID
    created_at: datetime.datetime


class Bill(BillInDBBase):
    """Public bill schema."""
    user_name: Optional[str] = None


class BillSummary(BaseModel):
    """Summary of bills for a period."""
    month: str
    total_bills: int
    paid_count: int
    unpaid_count: int
    paid_total: Decimal
    unpaid_total: Decimal


class BillPaymentRequest(BaseModel):
    """Request to initiate payment for a bill."""
    bill_id: UUID
    amount: Decimal
    currency: str = Field(default="INR")

    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        """Ensure amount is positive."""
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v

    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v: str) -> str:
        """Ensure currency is valid."""
        if v != "INR":
            raise ValueError("Only INR currency is supported")
        return v

