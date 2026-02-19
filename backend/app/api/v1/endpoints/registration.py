
import random
import datetime
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.api import deps
from app.db.session import get_db
from app.models.registration import RegistrationRequest as RegistrationModel
from app.models.user import User as UserModel
from app.schemas.registration import (
    RegistrationCreate, RegistrationRequest, RegistrationOTPVerify,
    RegistrationResendOTP
)
from app.core import security
from app.services.notification_service import NotificationService

router = APIRouter()


@router.post("/signup", response_model=RegistrationRequest)
async def signup(
    *,
    db: AsyncSession = Depends(get_db),
    reg_in: RegistrationCreate
) -> Any:
    """Public sign-up request."""
    # Check if email already exists in users or pending registrations
    if reg_in.email:
        user_q = select(UserModel).where(UserModel.email == reg_in.email)
        user_exists = await db.execute(user_q)
        if user_exists.scalars().first():
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

        reg_q = select(RegistrationModel).where(
            RegistrationModel.email == reg_in.email
        )
        reg_result = await db.execute(reg_q)
        existing_reg = reg_result.scalars().first()
        
        if existing_reg:
            if existing_reg.status == "VERIFYING":
                # Allow re-registration by updating the existing request
                otp_code = f"{random.randint(100000, 999999)}"
                otp_expires_at = (
                    datetime.datetime.now(datetime.timezone.utc) +
                    datetime.timedelta(minutes=10)
                )
                
                existing_reg.name = reg_in.name
                existing_reg.phone = reg_in.phone
                existing_reg.address = reg_in.address
                existing_reg.hashed_password = security.get_password_hash(reg_in.password)
                existing_reg.otp_code = otp_code
                existing_reg.otp_expires_at = otp_expires_at
                existing_reg.updated_at = datetime.datetime.now(datetime.timezone.utc)
                
                db.add(existing_reg)
                await db.commit()
                await db.refresh(existing_reg)
                
                await NotificationService.send_registration_otp(reg_in.email, otp_code)
                if reg_in.phone:
                    await NotificationService.send_registration_otp_via_phone(reg_in.phone, otp_code)
                return existing_reg
            
            raise HTTPException(
                status_code=400,
                detail="Registration request already pending for this email"
            )

    otp_code = f"{random.randint(100000, 999999)}"
    otp_expires_at = (
        datetime.datetime.now(datetime.timezone.utc) +
        datetime.timedelta(minutes=10)
    )

    db_reg = RegistrationModel(
        name=reg_in.name,
        email=reg_in.email,
        phone=reg_in.phone,
        address=reg_in.address,
        hashed_password=security.get_password_hash(reg_in.password),
        status="VERIFYING",
        otp_code=otp_code,
        otp_expires_at=otp_expires_at,
        is_verified=False
    )
    db.add(db_reg)
    await db.commit()
    await db.refresh(db_reg)

    await NotificationService.send_registration_otp(reg_in.email, otp_code)

    return db_reg


@router.post("/verify-otp", response_model=Any)
async def verify_otp(
    *,
    db: AsyncSession = Depends(get_db),
    verify_in: RegistrationOTPVerify
) -> Any:
    """Verify the OTP for a registration request."""
    q = select(RegistrationModel).where(
        RegistrationModel.email == verify_in.email,
        RegistrationModel.status == "VERIFYING"
    )
    result = await db.execute(q)
    reg = result.scalars().first()

    if not reg:
        raise HTTPException(
            status_code=404,
            detail="Verification request not found or already processed"
        )

    now = datetime.datetime.now(datetime.timezone.utc)
    # Ensure comparison is possible (both aware)
    otp_expiry = reg.otp_expires_at
    if otp_expiry.tzinfo is None:
        otp_expiry = otp_expiry.replace(tzinfo=datetime.timezone.utc)
    
    if otp_expiry < now:
        raise HTTPException(status_code=400, detail="OTP has expired")

    if reg.otp_code != verify_in.otp_code:
        raise HTTPException(
            status_code=400,
            detail="Invalid verification code"
        )

    # Mark as verified and move to PENDING admin approval
    reg.is_verified = True
    reg.status = "PENDING"
    reg.otp_code = None  # Clear the code
    db.add(reg)
    await db.commit()

    return {
        "status": "success",
        "message": "Identity verified. Awaiting admin approval."
    }


@router.post("/resend-otp", response_model=Any)
async def resend_otp(
    *,
    db: AsyncSession = Depends(get_db),
    resend_in: RegistrationResendOTP
) -> Any:
    """Resend OTP for a registration request."""
    q = select(RegistrationModel).where(
        RegistrationModel.email == resend_in.email,
        RegistrationModel.status == "VERIFYING"
    )
    result = await db.execute(q)
    reg = result.scalars().first()

    if not reg:
        raise HTTPException(
            status_code=404,
            detail="No pending verification found for this email"
        )

    # Generate new OTP
    otp_code = f"{random.randint(100000, 999999)}"
    otp_expires_at = (
        datetime.datetime.now(datetime.timezone.utc) +
        datetime.timedelta(minutes=10)
    )

    reg.otp_code = otp_code
    reg.otp_expires_at = otp_expires_at
    reg.updated_at = datetime.datetime.now(datetime.timezone.utc)

    db.add(reg)
    await db.commit()

    await NotificationService.send_registration_otp(reg.email, otp_code)

    return {
        "status": "success",
        "message": "New verification code sent."
    }

@router.get("/requests", response_model=List[RegistrationRequest])
async def get_registration_requests(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(deps.get_current_active_admin),
) -> Any:


    """List all pending registration requests."""
    result = await db.execute(
        select(RegistrationModel).where(RegistrationModel.status == "PENDING")
    )
    return result.scalars().all()

@router.post("/requests/{reg_id}/approve", response_model=Any)
async def approve_registration(
    *,
    db: AsyncSession = Depends(get_db),
    reg_id: UUID,
    current_user: UserModel = Depends(deps.get_current_active_admin),
) -> Any:
    """Approve a registration request and create a User."""
    result = await db.execute(select(RegistrationModel).where(RegistrationModel.id == reg_id))
    reg = result.scalars().first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration request not found")
    
    if reg.status != "PENDING":
        raise HTTPException(status_code=400, detail="Request already processed")

    # Create the user
    new_user = UserModel(
        name=reg.name,
        email=reg.email,
        phone=reg.phone,
        address=reg.address,
        hashed_password=reg.hashed_password,
        role="USER",
        is_active=True
    )
    db.add(new_user)
    
    # Update registration status
    reg.status = "APPROVED"
    db.add(reg)
    
    await db.commit()
    await db.refresh(new_user)
    return {"status": "success", "user_id": new_user.id}


@router.post("/requests/{reg_id}/reject", response_model=Any)
async def reject_registration(
    *,
    db: AsyncSession = Depends(get_db),
    reg_id: UUID,
    current_user: UserModel = Depends(deps.get_current_active_admin),
) -> Any:
    """Reject a registration request."""
    result = await db.execute(select(RegistrationModel).where(RegistrationModel.id == reg_id))
    reg = result.scalars().first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration request not found")
    
    reg.status = "REJECTED"
    db.add(reg)
    await db.commit()
    return {"status": "rejected"}
