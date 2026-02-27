"""UTR (Unique Transaction Reference) payment endpoints for DairyDay.

Handles:
- Customer UTR submission after bank transfer/UPI payment
- UTR validation and duplicate detection
- Admin verification workflow
- Screenshot upload for payment proof
- Email/SMS notifications
"""

import re
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import (
    APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request, Body
)
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.config import settings
from app.core.logging import get_logger
from app.core.redis import get_redis
from app.core.limiter import limiter
from app.db.session import get_db
from app.models.bill import Bill
from app.models.payment import Payment, PaymentStatus
from app.models.user import User
from app.schemas.payment import PaymentResponse
from app.services.notification_service import notify_admin_new_utr, notify_customer_payment_status

logger = get_logger(__name__)

router = APIRouter()

# Constants
UTR_PREFIX = "utr:submitted:"
UTR_PATTERN = re.compile(r'^[A-Z0-9]{12,22}$')
MIN_UTR_LENGTH = 12
MAX_UTR_LENGTH = 22


class UTRSubmission(BaseModel):
    """Schema for UTR payment submission by customers."""
    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode='before')
    @classmethod
    def check_submission_wrapper(cls, data):
        """Handle both direct submission and wrapped submission."""
        if isinstance(data, dict) and 'submission' in data:
            data = data['submission']
        return data

    bill_id: UUID = Field(..., description="Bill ID being paid")
    utr_number: str = Field(
        ...,
        min_length=MIN_UTR_LENGTH,
        max_length=MAX_UTR_LENGTH,
        description="UTR/Transaction reference number"
    )
    amount: float = Field(..., gt=0, description="Amount paid")
    payment_method: str = Field(
        default="bank_transfer",
        pattern="^(bank_transfer|upi|imps|neft|rtgs)$",
        description="Payment method used"
    )
    paid_at: Optional[datetime] = Field(
        default=None,
        description="Date/time of payment (defaults to now)"
    )
    notes: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional notes about the payment"
    )

    @field_validator('utr_number')
    def validate_utr_format(cls, v: str) -> str:
        """
        Validate UTR format based on payment type.

        Indian UTR formats:
        - NEFT/RTGS: 16-22 alphanumeric characters
        - UPI: 12 digit numeric (transaction ID)
        - IMPS: 12 digit numeric
        """
        # Normalize: uppercase, remove spaces
        cleaned = re.sub(r'\s+', '', v.upper())

        # Check length
        if len(cleaned) < MIN_UTR_LENGTH or len(cleaned) > MAX_UTR_LENGTH:
            raise ValueError(f"UTR must be {MIN_UTR_LENGTH}-{MAX_UTR_LENGTH} characters")

        # Check for valid characters (alphanumeric only)
        if not UTR_PATTERN.match(cleaned):
            raise ValueError("UTR can only contain letters and numbers (no special characters)")

        # Specific validation based on apparent type
        if cleaned.isdigit():
            # Numeric UTR (UPI/IMPS) - should be 12 digits
            if len(cleaned) != 12:
                raise ValueError("UPI/IMPS UTR should be exactly 12 digits")

        return cleaned

    @field_validator('amount')
    def validate_amount_precision(cls, v: float) -> float:
        """Ensure amount has at most 2 decimal places (paise)."""
        rounded = round(v, 2)
        if abs(rounded - v) > 0.001:
            raise ValueError("Amount can have at most 2 decimal places")
        return rounded


class UTRVerification(BaseModel):
    """Schema for admin UTR verification."""

    approved: bool = Field(..., description="Whether to approve or reject")
    reason: Optional[str] = Field(
        None,
        max_length=500,
        description="Reason for rejection (required if not approved)"
    )

    @field_validator('reason')
    def validate_rejection_reason(cls, v: Optional[str], values: dict) -> Optional[str]:
        """Require reason if rejecting."""
        if not values.get('approved') and not v:
            raise ValueError("Reason is required when rejecting a payment")
        return v


class UTRSubmissionResponse(BaseModel):
    """Response schema for UTR submission."""

    status: str
    message: str
    payment_id: UUID
    utr_number: str
    estimated_verification_hours: int = 24
    submitted_at: datetime


@router.post(
    "/submit-utr",
    response_model=UTRSubmissionResponse,
    status_code=status.HTTP_201_CREATED
)
class UTRSubmission(BaseModel):
    """Schema for UTR payment submission by customers."""
    model_config = ConfigDict(populate_by_name=True)
    
    @model_validator(mode='before')
    @classmethod
    def check_submission_wrapper(cls, data):
        """Handle both direct submission and wrapped submission."""
        if isinstance(data, dict) and 'submission' in data:
            return data['submission']
        return data
    
    bill_id: UUID = Field(..., description="Bill ID being paid")

@limiter.limit("3/minute")
async def submit_utr(
    request: Request,
    submission: UTRSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
    screenshot: Optional[UploadFile] = File(None)
) -> UTRSubmissionResponse:
    """
    Submit UTR number after making bank transfer/UPI payment.
    """
    # Normalize UTR
    utr_number = submission.utr_number.upper().replace(" ", "")

    # 1. Verify bill exists and belongs to user
    bill = await db.get(Bill, submission.bill_id)
    if not bill:
        logger.warning(f"UTR submission for non-existent bill: {submission.bill_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )

    # 2. Authorization check
    if str(bill.user_id) != str(current_user.id) and current_user.role != "ADMIN":
        logger.warning(
            f"Unauthorized UTR submission attempt by {current_user.id} for bill {bill.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to submit payment for this bill"
        )

    # 3. Check if bill already paid
    if bill.status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bill already paid"
        )

    # 4. Check for duplicate UTR (prevent double-submission)
    redis = get_redis()
    utr_key = f"{UTR_PREFIX}{utr_number}"

    existing_payment = await db.execute(
        select(Payment).where(
            Payment.utr_number == utr_number,
            Payment.status.in_(["PENDING_VERIFICATION", "PAID"])
        )
    )
    if existing_payment.scalar_one_or_none():
        logger.warning(f"Duplicate UTR submission attempt: {utr_number}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This UTR has already been submitted. Please check your payment history or contact support."
        )

    # Also check Redis for recent submissions (faster)
    if await redis.get(utr_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="UTR submission is being processed. Please wait a few minutes."
        )

    # 5. Validate amount matches bill (with small tolerance for rounding)
    expected_amount = float(bill.total_amount)
    submitted_amount = submission.amount

    if abs(submitted_amount - expected_amount) > 1.0:  # 1 rupee tolerance
        logger.warning(
            f"Amount mismatch for bill {bill.id}: expected {expected_amount}, got {submitted_amount}"
        )
        # Don't reject, just flag for admin attention
        amount_mismatch_note = f"Amount mismatch: Expected ₹{expected_amount}, submitted ₹{submitted_amount}"
        notes = f"{submission.notes or ''}\n{amount_mismatch_note}".strip()
    else:
        notes = submission.notes

    # 6. Handle screenshot upload if provided
    screenshot_url = None
    if screenshot:
        # Validate file type
        allowed_types = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
        if screenshot.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
            )

        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        content = await screenshot.read()
        if len(content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 5MB."
            )

        # Upload to S3/MinIO
        from app.services.s3_uploader import upload_file
        screenshot_url = await upload_file(
            file_content=content,
            filename=f"utr_screenshots/{bill.id}/{datetime.utcnow().isoformat()}_{screenshot.filename}",
            content_type=screenshot.content_type
        )
        logger.info(f"Screenshot uploaded for UTR submission: {screenshot_url}")

    # 7. Create pending payment record
    payment = Payment(
        bill_id=submission.bill_id,
        user_id=current_user.id,
        utr_number=utr_number,
        amount=submitted_amount,
        status=PaymentStatus.PENDING_VERIFICATION,
        payment_method=submission.payment_method,
        paid_at=submission.paid_at or datetime.utcnow(),
        screenshot_url=screenshot_url,
        notes=notes,
        submitted_at=datetime.utcnow()
    )

    db.add(payment)
    await db.flush()  # Get payment.id

    # 8. Mark UTR as submitted in Redis (24 hour TTL)
    await redis.setex(utr_key, 86400, str(payment.id))

    # 9. Update bill status to show payment pending
    bill.status = "PENDING_VERIFICATION"

    await db.commit()

    # 10. Notify admin (async task)
    try:
        await notify_admin_new_utr(payment.id, current_user.name, bill.id)
    except Exception as e:
        logger.error(f"Failed to send admin notification: {e}")
        # Don't fail the request if notification fails

    logger.info(
        f"UTR submitted: {utr_number} for bill {bill.id} by user {current_user.id}"
    )

    return UTRSubmissionResponse(
        status="success",
        message="Payment submitted successfully. Our team will verify the UTR within 24 hours.",
        payment_id=payment.id,
        utr_number=utr_number,
        estimated_verification_hours=24,
        submitted_at=payment.submitted_at
    )


@router.post(
    "/verify-utr/{payment_id}",
    response_model=PaymentResponse
)
async def verify_utr(
    payment_id: UUID,
    verification: UTRVerification,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin)
) -> PaymentResponse:
    """
    Admin verifies or rejects UTR submission.

    This endpoint is restricted to admin users only.

    Args:
        payment_id: Payment record ID to verify
        verification: Approval decision and optional rejection reason

    Returns:
        Updated Payment record

    Raises:
        404: Payment not found
        400: Payment not in pending verification state
        403: Not authorized (non-admin)
    """
    # 1. Get payment record
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )

    # 2. Verify it's in correct state
    if payment.status != PaymentStatus.PENDING_VERIFICATION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment cannot be verified (current status: {payment.status})"
        )

    # 3. Process verification
    if verification.approved:
        # Approve payment
        payment.status = PaymentStatus.PAID
        payment.verified_at = datetime.utcnow()
        payment.verified_by = current_user.id

        # Update bill status
        bill = await db.get(Bill, payment.bill_id)
        if bill:
            bill.status = "PAID"
            bill.paid_at = datetime.utcnow()
            bill.payment_method = payment.payment_method

        # Release Redis lock
        redis = get_redis()
        await redis.delete(f"{UTR_PREFIX}{payment.utr_number}")

        logger.info(
            f"UTR approved: {payment.utr_number} by admin {current_user.id}"
        )

        message = "Payment verified successfully."
    else:
        # Reject payment
        payment.status = PaymentStatus.REJECTED
        payment.rejection_reason = verification.reason
        payment.verified_at = datetime.utcnow()
        payment.verified_by = current_user.id

        # Revert bill status back to unpaid
        bill = await db.get(Bill, payment.bill_id)
        if bill and bill.status == "PENDING_VERIFICATION":
            bill.status = "UNPAID"

        logger.info(
            f"UTR rejected: {payment.utr_number} by admin {current_user.id}. Reason: {verification.reason}"
        )

        message = f"Payment rejected. Reason: {verification.reason}"

    await db.commit()
    await db.refresh(payment)

    # 4. Notify customer (async)
    try:
        await notify_customer_payment_status(payment.id, verification.approved)
    except Exception as e:
        logger.error(f"Failed to send customer notification: {e}")

    return PaymentResponse(
        id=payment.id,
        bill_id=payment.bill_id,
        amount=payment.amount,
        status=payment.status,
        utr_number=payment.utr_number,
        payment_method=payment.payment_method,
        paid_at=payment.paid_at,
        verified_at=payment.verified_at,
        message=message
    )


@router.get(
    "/pending-verification",
    response_model=list[PaymentResponse]
)
async def list_pending_utrs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
    skip: int = 0,
    limit: int = 50
) -> list[PaymentResponse]:
    """
    List all UTR payments pending admin verification.

    Admin only endpoint for the verification dashboard.

    Args:
        skip: Pagination offset
        limit: Max items to return

    Returns:
        List of pending Payment records
    """
    from sqlalchemy import desc

    result = await db.execute(
        select(Payment)
        .where(Payment.status == PaymentStatus.PENDING_VERIFICATION)
        .order_by(desc(Payment.submitted_at))
        .offset(skip)
        .limit(limit)
    )

    payments = result.scalars().all()

    return [
        PaymentResponse(
            id=p.id,
            bill_id=p.bill_id,
            user_id=p.user_id,
            amount=p.amount,
            status=p.status,
            utr_number=p.utr_number,
            payment_method=p.payment_method,
            screenshot_url=p.screenshot_url,
            notes=p.notes,
            submitted_at=p.submitted_at,
            paid_at=p.paid_at
        )
        for p in payments
    ]


@router.get(
    "/my-utr-submissions",
    response_model=list[PaymentResponse]
)
async def list_my_utr_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> list[PaymentResponse]:
    """
    List current user's UTR payment submissions.

    For customers to track their payment verification status.
    """
    from sqlalchemy import desc

    result = await db.execute(
        select(Payment)
        .where(
            Payment.user_id == current_user.id,
            Payment.utr_number.isnot(None)  # Only UTR payments
        )
        .order_by(desc(Payment.submitted_at))
    )

    payments = result.scalars().all()

    return [
        PaymentResponse(
            id=p.id,
            bill_id=p.bill_id,
            amount=p.amount,
            status=p.status,
            utr_number=p.utr_number,
            payment_method=p.payment_method,
            screenshot_url=p.screenshot_url,
            notes=p.notes,
            submitted_at=p.submitted_at,
            verified_at=p.verified_at,
            paid_at=p.paid_at,
            rejection_reason=p.rejection_reason
        )
        for p in payments
    ]
