"""Payment endpoints for DairyOS.

Handles:
- Payment order creation with idempotency
- Webhook handling with HMAC verification and replay protection
"""
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from uuid import UUID
import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone

from app.api import deps
from app.db.session import get_db
from app.models.bill import Bill
from app.models.payment import Payment
from app.models.user import User
# from app.models.idempotency_key import IdempotencyKey (Migrated to Redis)
from app.models.webhook_event import WebhookEvent
from app.core.config import settings
from app.core.context import get_request_id
from app.core.redis import get_redis

logger = logging.getLogger(__name__)

router = APIRouter()

from app.core.razorpay_utils import get_razorpay_client


@router.get("/last")
async def get_last_payment(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get the last successful payment for the current user."""
    result = await db.execute(
        select(Payment)
        .join(Bill)
        .where(
            Bill.user_id == current_user.id,
            Payment.status == "SUCCESS"
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
        "id": payment.id
    }


@router.post("/create-order/{bill_id}")
async def create_payment_order(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> Any:
    """Create a payment order for a bill.

    Supports idempotency via the Idempotency-Key header.
    """
    # 1. Get Bill
    result = await db.execute(select(Bill).where(Bill.id == bill_id))
    bill = result.scalars().first()

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    # Verify user owns this bill (or is admin)
    if current_user.role != "ADMIN" and bill.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay this bill")

    if bill.status == "PAID":
        raise HTTPException(status_code=400, detail="Bill already paid")

    # 2. Prepare order data
    amount_in_paise = int(float(bill.total_amount) * 100)
    order_data = {
        "amount": amount_in_paise,
        "currency": "INR",
        "receipt": str(bill.id),
        "notes": {
            "user_id": str(current_user.id),
            "bill_id": str(bill.id),
            "month": bill.month
        }
    }

    # 3. Check idempotency
    req_hash = hashlib.sha256(
        json.dumps(order_data, sort_keys=True).encode()
    ).hexdigest()

    redis = get_redis()
    if idempotency_key:
        cache_key = f"idem:{idempotency_key}:{req_hash}"
        cached_response = await redis.get(cache_key)
        if cached_response:
            logger.info(
                "Returning cached order response for idempotency key: %s",
                idempotency_key
            )
            return json.loads(cached_response)

    # 4. Create order
    client = get_razorpay_client()

    try:
        order = client.order_create(data=order_data)

        # 5. Store idempotency key in Redis (24h expiry)
        if idempotency_key:
            cache_key = f"idem:{idempotency_key}:{req_hash}"
            await redis.set(cache_key, json.dumps(order), ex=86400)

        logger.info(
            "Payment order created: %s for bill %s amount %d",
            order.get("id"), bill_id, amount_in_paise
        )

        return order

    except Exception as e:
        logger.error("Failed to create payment order: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@router.post("/webhook")
async def payment_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Handle payment webhooks from Razorpay.

    Security features:
    - HMAC signature verification
    - Timestamp skew check
    - Idempotency via event_id deduplication
    - Full payload storage for audit
    """
    request_id = get_request_id()

    # 1. Read raw body for signature verification
    body_bytes = await request.body()

    # 2. Get headers
    signature = request.headers.get('X-Razorpay-Signature')
    webhook_timestamp = request.headers.get('X-Razorpay-Timestamp')
    event_id = request.headers.get('X-Razorpay-Event-ID')

    # 3. Verify signature if secret is configured
    if settings.RAZORPAY_WEBHOOK_SECRET:
        if not signature:
            logger.warning(
                "Webhook %s missing signature header",
                request_id
            )
            raise HTTPException(status_code=400, detail="Missing signature header")

        # Compute expected signature
        expected_signature = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode('utf-8'),
            body_bytes,
            hashlib.sha256
        ).hexdigest()

        # Constant-time comparison to prevent timing attacks
        if not hmac.compare_digest(expected_signature, signature):
            logger.warning(
                "Webhook %s invalid signature",
                request_id
            )
            raise HTTPException(status_code=400, detail="Invalid signature")

        # 4. Timestamp skew check (±5 minutes)
        if webhook_timestamp:
            try:
                ts = int(webhook_timestamp)
                webhook_time = datetime.fromtimestamp(ts, tz=timezone.utc)
                now = datetime.now(timezone.utc)
                skew = abs((now - webhook_time).total_seconds())

                if skew > 300:
                    logger.warning(
                        "Webhook %s timestamp skew too large: %ds",
                        request_id, skew
                    )
                    raise HTTPException(
                        status_code=400,
                        detail=f"Webhook timestamp skew too large: {skew}s"
                    )
            except (ValueError, TypeError) as e:
                logger.warning(
                    "Webhook %s invalid timestamp header: %s",
                    request_id, str(e)
                )
                raise HTTPException(status_code=400, detail="Invalid timestamp format")

    # 5. Parse payload
    try:
        data = json.loads(body_bytes.decode('utf-8'))
    except json.JSONDecodeError as e:
        logger.warning("Webhook %s invalid JSON: %s", request_id, str(e))
        return {"status": "error", "message": "invalid_json"}

    # 6. Extract event information
    event_type = data.get("event")
    payload = data.get("payload", {})

    # Get event ID from various possible locations
    provider_event_id = (
        event_id or
        data.get("event_id") or
        data.get("id") or
        payload.get("payment", {}).get("entity", {}).get("id") or
        payload.get("order", {}).get("entity", {}).get("id")
    )

    logger.info(
        "Webhook %s received: event=%s event_id=%s",
        request_id, event_type, provider_event_id
    )

    # 7. Handle specific events
    payment_entity = None
    if event_type == "payment.captured":
        payment_entity = payload.get("payment", {}).get("entity", {})
    elif event_type == "order.paid":
        payment_entity = payload.get("order", {}).get("entity", {})
    elif event_type == "payment.failed":
        payment_entity = payload.get("payment", {}).get("entity", {})
        # Handle failed payment
        return await _handle_payment_failed(
            db, request_id, payment_entity, data
        )
    else:
        logger.info("Webhook %s ignoring event type: %s", request_id, event_type)
        return {"status": "ignored", "reason": f"event_{event_type}_not_handled"}

    if not payment_entity:
        return {"status": "error", "message": "no_entity_found"}

    # 8. Extract payment details
    payment_id = payment_entity.get("id")
    notes = payment_entity.get("notes", {})
    bill_id_str = notes.get("bill_id")

    if not payment_id:
        return {"status": "error", "message": "missing_payment_id"}

    if not bill_id_str:
        # Try to find bill via order ID or other means
        logger.warning(
            "Webhook %s missing bill_id in notes for payment %s",
            request_id, payment_id
        )
        return {"status": "ignored", "reason": "missing_bill_id_in_notes"}

    # 9. Idempotency check (replay protection)
    existing_event = await db.execute(
        select(WebhookEvent).where(
            and_(
                WebhookEvent.provider == "razorpay",
                WebhookEvent.event_id == payment_id
            )
        )
    )
    if existing_event.scalars().first():
        logger.info(
            "Webhook %s already processed: payment %s",
            request_id, payment_id
        )
        return {"status": "success", "message": "already_processed"}

    # 10. Create webhook event record (for audit trail)
    webhook_event = WebhookEvent(
        provider="razorpay",
        event_id=payment_id,
        event_type=event_type,
        payload=data,  # Store full payload for audit
        status="processing"
    )
    db.add(webhook_event)

    # 11. Process the payment
    try:
        bill_id = UUID(bill_id_str)

        # Fetch bill with lock for update
        bill_result = await db.execute(
            select(Bill).where(Bill.id == bill_id).with_for_update()
        )
        bill = bill_result.scalars().first()

        if not bill:
            logger.warning(
                "Webhook %s bill not found: %s",
                request_id, bill_id_str
            )
            webhook_event.status = "failed"
            await db.commit()
            return {"status": "error", "message": "bill_not_found"}

        if bill.status == "PAID":
            # Bill already paid, just record the event
            logger.info(
                "Webhook %s bill already paid: %s",
                request_id, bill_id
            )
            webhook_event.status = "processed"
            await db.commit()
            return {"status": "success", "message": "bill_already_paid"}

        # Update bill status
        bill.status = "PAID"

        # Create payment record
        payment = Payment(
            bill_id=bill.id,
            provider="razorpay",
            provider_payment_id=payment_id,
            amount=bill.total_amount,
            status="SUCCESS",
            paid_at=func.now()
        )

        db.add(bill)
        db.add(payment)

        # Mark webhook event as processed
        webhook_event.status = "processed"
        webhook_event.processed_at = func.now()

        await db.commit()

        logger.info(
            "Webhook %s payment processed: bill %s payment %s amount %s",
            request_id, bill_id, payment_id, bill.total_amount
        )

        return {"status": "success"}

    except Exception as e:
        await db.rollback()
        logger.error(
            "Webhook %s processing error: %s",
            request_id, str(e)
        )

        # Update webhook event status
        webhook_event.status = "failed"
        try:
            await db.commit()
        except Exception:
            pass

        raise HTTPException(status_code=500, detail="Internal processing error")


async def _handle_payment_failed(
    db: AsyncSession,
    request_id: str,
    payment_entity: dict,
    full_payload: dict
) -> dict:
    """Handle payment.failed webhook events."""
    payment_id = payment_entity.get("id")
    notes = payment_entity.get("notes", {})
    bill_id_str = notes.get("bill_id")

    # Record the failed payment
    webhook_event = WebhookEvent(
        provider="razorpay",
        event_id=payment_id,
        event_type="payment.failed",
        payload=full_payload,
        status="processed"
    )
    db.add(webhook_event)

    if bill_id_str:
        try:
            bill_id = UUID(bill_id_str)
            bill_result = await db.execute(
                select(Bill).where(Bill.id == bill_id)
            )
            bill = bill_result.scalars().first()

            if bill and bill.status != "PAID":
                # Create failed payment record for tracking
                payment = Payment(
                    bill_id=bill.id,
                    provider="razorpay",
                    provider_payment_id=payment_id,
                    amount=0,  # Failed payment has no amount
                    status="FAILED",
                    paid_at=None
                )
                db.add(payment)

                logger.info(
                    "Webhook %s payment failed recorded: bill %s payment %s",
                    request_id, bill_id, payment_id
                )
        except (ValueError, Exception) as e:
            logger.warning(
                "Webhook %s error recording failed payment: %s",
                request_id, str(e)
            )

    await db.commit()

    return {"status": "success", "message": "payment_failure_recorded"}

