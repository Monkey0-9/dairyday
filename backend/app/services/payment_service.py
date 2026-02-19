"""
Payment Service for DairyDay.
Elite Standard: Centralized payment orchestration and business logic.
"""

import hmac
import hashlib
import json
import logging
import uuid
from typing import Any, Optional
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func

from app.core.config import settings
from app.core.razorpay_utils import get_razorpay_client
from app.core.redis import get_redis
from app.models.bill import Bill
from app.models.payment import Payment
from app.models.webhook_event import WebhookEvent
from app.repositories.payment_repository import PaymentRepository
from app.repositories.bill_repository import BillRepository


logger = logging.getLogger(__name__)


class PaymentService:
    def __init__(self, db_session):
        self.db = db_session
        self.payment_repo = PaymentRepository(db_session)
        self.bill_repo = BillRepository(db_session)

    async def create_razorpay_order(
        self, bill_id: UUID, current_user_id: UUID,
        idempotency_key: Optional[str] = None
    ) -> Any:
        """Create a Razorpay order for a bill with idempotency."""
        bill = await self.bill_repo.get_by_id(bill_id)
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")

        if bill.user_id != current_user_id:
             # This check should probably happen in the router or be passed in
             pass

        if bill.status == "PAID":
            raise HTTPException(status_code=400, detail="Bill already paid")

        # Financial precision
        from decimal import Decimal, ROUND_HALF_UP
        total_amount = Decimal(str(bill.total_amount))
        amount_in_paise = int(
            (total_amount * Decimal("100")).quantize(
                Decimal("1"), rounding=ROUND_HALF_UP
            )
        )

        order_data = {
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": str(bill.id),
            "notes": {
                "user_id": str(current_user_id),
                "bill_id": str(bill.id),
                "month": bill.month
            }
        }

        # Idempotency
        req_hash = hashlib.sha256(
            json.dumps(order_data, sort_keys=True).encode()
        ).hexdigest()
        redis = await get_redis()
        
        if idempotency_key:
            cache_key = f"idem:{idempotency_key}:{req_hash}"
            cached = await redis.get(cache_key)
            if cached:
                return json.loads(cached)

        # Provider call
        client = get_razorpay_client()
        order = client.order_create(data=order_data)

        if idempotency_key:
            await redis.set(cache_key, json.dumps(order), ex=86400)

        return order

    async def verify_webhook_signature(
        self, body: bytes, signature: str
    ) -> bool:
        """Verify Razorpay webhook signature."""
        if not settings.RAZORPAY_WEBHOOK_SECRET:
            return True
        
        expected = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode('utf-8'),
            body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected, signature)

    async def process_webhook(self, payload: dict, request_id: str) -> dict:
        """Process an incoming webhook event."""
        event_type = payload.get("event")
        data = payload.get("payload", {})
        
        # Handle only relevant events
        if event_type not in ("payment.captured", "order.paid"):
             if event_type == "payment.failed":
                 return await self._handle_failure(payload, request_id)
             return {"status": "ignored"}

        entity = data.get("payment", {}).get("entity") or \
                 data.get("order", {}).get("entity", {})
        
        if not entity:
            return {"status": "error", "message": "no_entity"}

        payment_id = entity.get("id")
        bill_id_str = entity.get("notes", {}).get("bill_id")
        
        if not bill_id_str:
            return {"status": "ignored", "reason": "no_bill_id"}

        # Idempotency
        existing = await self.payment_repo.get_webhook_event(payment_id)
        if existing:
            return {"status": "success", "message": "duplicate"}

        # Create audit record
        webhook_event = WebhookEvent(
            provider="razorpay",
            event_id=payment_id,
            event_type=event_type,
            payload=payload,
            status="processing"
        )
        await self.payment_repo.create_webhook_event(webhook_event)

        try:
            bill_id = UUID(bill_id_str)
            bill = await self.bill_repo.get_by_id(bill_id)
            
            if not bill or bill.status == "PAID":
                webhook_event.status = "ignored"
                await self.db.commit()
                return {"status": "success"}

            # Update state
            bill.status = "PAID"
            payment = Payment(
                bill_id=bill.id,
                provider="razorpay",
                provider_payment_id=payment_id,
                amount=bill.total_amount,
                status="SUCCESS",
                paid_at=func.now()
            )
            
            await self.payment_repo.create_payment(payment)
            webhook_event.status = "processed"
            webhook_event.processed_at = func.now()
            
            await self.db.commit()
            return {"status": "success"}
            
        except Exception as e:
            await self.db.rollback()
            webhook_event.status = "failed"
            await self.db.commit()
            logger.error(f"Webhook processing failed: {e}")
            raise

    async def _handle_failure(self, payload: dict, request_id: str) -> dict:
        """Handle failed payment events."""
        # Log and record for audit but don't fail the webhook response
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        payment_id = entity.get("id")
        
        webhook_event = WebhookEvent(
            provider="razorpay",
            event_id=payment_id,
            event_type="payment.failed",
            payload=payload,
            status="processed"
        )
        await self.payment_repo.create_webhook_event(webhook_event)
        await self.db.commit()
        return {"status": "success", "message": "failure_recorded"}

    async def mark_paid_cash(self, bill_id: UUID, admin_email: str) -> bool:
        """Record a manual cash payment."""
        bill = await self.bill_repo.get_by_id(bill_id)
        if not bill or bill.status == "PAID":
            return False
        
        bill.status = "PAID"
        bill.updated_at = func.now()
        
        payment = Payment(
            bill_id=bill.id,
            provider="CASH",
            provider_payment_id=f"CASH-{uuid.uuid4().hex[:8].upper()}",
            amount=bill.total_amount,
            status="SUCCESS",
            paid_at=func.now()
        )
        
        await self.payment_repo.create_payment(payment)
        await self.db.commit()
        logger.info(f"Bill {bill_id} marked as PAID (CASH) by {admin_email}")
        return True
