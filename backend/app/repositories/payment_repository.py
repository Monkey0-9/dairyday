"""
Payment Repository for DairyDay.
Centralized database logic for Payments and WebhookEvents.
"""

from typing import Optional, List
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.payment import Payment
from app.models.webhook_event import WebhookEvent


class PaymentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_payment_by_id(
        self, payment_id: UUID
    ) -> Optional[Payment]:
        """Fetch a payment by its ID."""
        result = await self.db.execute(
            select(Payment).where(Payment.id == payment_id)
        )
        return result.scalars().first()

    async def get_payment_by_provider_id(
        self, provider_payment_id: str
    ) -> Optional[Payment]:
        """Fetch a payment by its provider payment ID."""
        result = await self.db.execute(
            select(Payment).where(
                Payment.provider_payment_id == provider_payment_id
            )
        )
        return result.scalars().first()

    async def get_webhook_event(
        self, event_id: str
    ) -> Optional[WebhookEvent]:
        """Fetch a webhook event by its ID (for idempotency)."""
        result = await self.db.execute(
            select(WebhookEvent).where(
                WebhookEvent.event_id == event_id
            )
        )
        return result.scalars().first()

    async def create_payment(self, payment: Payment) -> Payment:
        """Persist a new payment."""
        self.db.add(payment)
        await self.db.flush()
        return payment

    async def create_webhook_event(
        self, event: WebhookEvent
    ) -> WebhookEvent:
        """Persist a webhook event."""
        self.db.add(event)
        await self.db.flush()
        return event

    async def get_all_for_bill(
        self, bill_id: UUID
    ) -> List[Payment]:
        """Fetch all payments associated with a bill."""
        result = await self.db.execute(
            select(Payment).where(Payment.bill_id == bill_id)
        )
        return result.scalars().all()
