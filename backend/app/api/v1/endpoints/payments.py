"""Payment endpoints for DairyOS.

Clean router architecture.
Delegates business logic to PaymentService.
"""

from typing import Any
from uuid import UUID
import logging

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Header,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.models.bill import Bill
from app.models.payment import Payment
from app.services.payment_service import PaymentService
from app.core.context import get_request_id
from app.core.cache import cache_response

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/last")
@cache_response(expire=60)
async def get_last_payment(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get the last successful payment for the current user."""
    result = await db.execute(
        select(Payment)
        .join(Bill)
        .where(
            Bill.user_id == current_user.id,
            Payment.status == "SUCCESS",
        )
        .order_by(Payment.paid_at.desc())
        .limit(1)
    )
    payment = result.scalars().first()

    if not payment:
        return None

    return {
        "amount": payment.amount,
        "paid_at": payment.paid_at,
        "provider": payment.provider,
        "id": payment.id,
    }


@router.post("/create-order/{bill_id}")
async def create_payment_order(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    idempotency_key: str = Depends(deps.require_idempotency_key),
) -> Any:
    """Create a payment order for a bill."""
    # Permission check
    res = await db.execute(select(Bill).where(Bill.id == bill_id))
    bill = res.scalars().first()

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    if current_user.role != "ADMIN" and bill.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to pay this bill",
        )

    service = PaymentService(db)
    return await service.create_razorpay_order(
        bill_id, current_user.id, idempotency_key
    )


@router.post("/webhook")
async def payment_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Handle payment webhooks from Razorpay."""
    service = PaymentService(db)
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature")

    if not await service.verify_webhook_signature(body, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        payload = await request.json()
        return await service.process_webhook(payload, get_request_id())
    except Exception as e:
        logger.error("Webhook processing error: %s", e)
        raise HTTPException(status_code=500, detail="Webhook failed")


@router.post("/mark-paid/{bill_id}")
async def mark_bill_as_paid(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_billing_manager),
    idempotency_key: str = Depends(deps.require_idempotency_key),
) -> Any:
    """Mark a bill as PAID by Admin (Cash Payment)."""
    service = PaymentService(db)
    success = await service.mark_paid_cash(bill_id, current_user.email)

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Bill not found or already paid",
        )

    return {
        "message": "Bill marked as PAID via Cash",
        "bill_id": str(bill_id),
        "status": "PAID",
    }
