from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Optional
from uuid import UUID
import datetime
from decimal import Decimal
import re


class UserBase(BaseModel):
    """Base user schema with common fields."""
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(
        ...,
        min_length=2,
        max_length=255,
        description="User's full name"
    )
    email: Optional[EmailStr] = Field(
        None,
        description="User's email address"
    )
    phone: Optional[str] = Field(
        None,
        pattern=r'^\+?[1-9]\d{1,14}$',
        description="Phone number in E.164 format"
    )
    role: str = Field(
        default="USER",
        description="User role (ADMIN or USER)"
    )
    price_per_liter: Decimal = Field(
        default=Decimal("0.0"),
        ge=0,
        le=1000,
        description="Price per liter in INR"
    )
    is_active: bool = Field(
        default=True,
        description="Whether the user account is active"
    )


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="User password (min 8 characters)"
    )

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Validate password meets minimum security requirements."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r'[A-Za-z]', v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r'[0-9]', v):
            raise ValueError("Password must contain at least one number")
        return v


class UserUpdate(BaseModel):
    """Schema for updating user information."""
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = Field(
        None,
        min_length=2,
        max_length=255
    )
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(
        None,
        pattern=r'^\+?[1-9]\d{1,14}$'
    )
    role: Optional[str] = Field(
        None,
        pattern=r'^(ADMIN|USER)$'
    )
    price_per_liter: Optional[Decimal] = Field(
        None,
        ge=0,
        le=1000
    )
    is_active: Optional[bool] = None
    password: Optional[str] = Field(
        None,
        min_length=8,
        max_length=128
    )


class PasswordChange(BaseModel):
    """Schema for changing password."""
    model_config = ConfigDict(populate_by_name=True)

    old_password: str = Field(
        ...,
        min_length=1,
        description="Current password"
    )
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="New password"
    )

    @field_validator('new_password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Validate new password meets minimum security requirements."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r'[A-Za-z]', v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r'[0-9]', v):
            raise ValueError("Password must contain at least one number")
        return v


class UserInDBBase(UserBase):
    """Base schema for user in database."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime.datetime


class User(UserInDBBase):
    """Public user schema (without sensitive data)."""
    pass


class UserInDB(UserInDBBase):
    """User schema for internal use (includes hashed password)."""
    hashed_password: str


class ForgotPassword(BaseModel):
    """Schema for forgot password request."""
    email: EmailStr


class ResetPassword(BaseModel):
    """Schema for resetting password with a token."""
    token: str
    new_password: str = Field(..., min_length=8)

