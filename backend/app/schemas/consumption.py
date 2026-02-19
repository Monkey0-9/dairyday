from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
from uuid import UUID
import datetime
from decimal import Decimal


class ConsumptionBase(BaseModel):
    """Base consumption schema."""
    model_config = ConfigDict(from_attributes=True)

    date: datetime.date = Field(
        ...,
        description="Date of milk consumption"
    )
    quantity: Decimal = Field(
        ...,
        ge=0,
        le=1000,
        description="Quantity of milk in liters"
    )
    extra_qty: Decimal = Field(
        default=Decimal("0.0"),
        ge=0,
        le=1000,
        description="Extra quantity of milk in liters (pre-order)"
    )
    status: str = Field(
        default="PENDING",
        description="Status of delivery (PENDING, DELIVERED, CANCELLED, SKIPPED)"
    )
    note: Optional[str] = Field(
        None,
        description="Optional note for the delivery"
    )
    # Confirmation Workflow fields
    requested_quantity: Optional[Decimal] = Field(None, ge=0)
    requested_extra_qty: Optional[Decimal] = Field(None, ge=0)
    request_status: Optional[str] = Field(None) # PENDING, APPROVED, REJECTED
    request_note: Optional[str] = Field(None)


class ConsumptionCreate(BaseModel):
    """Schema for creating a consumption record."""
    model_config = ConfigDict(populate_by_name=True)

    user_id: UUID = Field(
        ...,
        description="ID of the user"
    )
    date: datetime.date = Field(
        ...,
        description="Date of milk consumption"
    )
    quantity: Decimal = Field(
        ...,
        ge=0,
        le=1000,
        description="Quantity of milk in liters"
    )
    extra_qty: Optional[Decimal] = Field(default=Decimal("0.0"), ge=0, le=1000)
    status: Optional[str] = Field(default="PENDING")
    note: Optional[str] = Field(None)
    requested_quantity: Optional[Decimal] = None
    requested_extra_qty: Optional[Decimal] = None
    request_status: Optional[str] = None
    request_note: Optional[str] = None

    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, v: Decimal) -> Decimal:
        """Ensure quantity is a valid decimal."""
        if v < 0:
            raise ValueError("Quantity cannot be negative")
        return v


class ConsumptionUpdate(BaseModel):
    """Schema for updating a consumption record."""
    model_config = ConfigDict(populate_by_name=True)

    quantity: Optional[Decimal] = Field(
        None,
        ge=0,
        le=1000,
        description="Updated quantity of milk in liters"
    )
    extra_qty: Optional[Decimal] = Field(None, ge=0)
    status: Optional[str] = None
    note: Optional[str] = None
    requested_quantity: Optional[Decimal] = None
    requested_extra_qty: Optional[Decimal] = None
    request_status: Optional[str] = None
    request_note: Optional[str] = None


class MyConsumptionRequest(BaseModel):
    """Schema for users to update their own consumption."""
    date: datetime.date
    quantity: Decimal = Field(..., ge=0, le=1000)
    extra_qty: Decimal = Field(default=Decimal("0.0"), ge=0, le=1000)
    status: Optional[str] = "PENDING"
    note: Optional[str] = None


class ConsumptionInDBBase(ConsumptionBase):
    """Base schema for consumption in database."""
    id: UUID
    user_id: UUID
    locked: bool = Field(
        default=False,
        description="Whether the entry is locked for editing"
    )
    created_at: datetime.datetime


class Consumption(ConsumptionInDBBase):
    """Public consumption schema."""
    pass


class ConsumptionGridRow(BaseModel):
    """Schema for consumption grid row."""
    user_id: UUID
    user_name: str
    days: dict[int, Decimal]  # Day number -> quantity

    @field_validator('days')
    @classmethod
    def validate_days(cls, v: dict) -> dict:
        """Ensure all day values are valid quantities."""
        for day, qty in v.items():
            if qty < 0 or qty > 1000:
                raise ValueError(f"Invalid quantity for day {day}")
        return v

