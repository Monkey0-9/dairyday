from decimal import Decimal, ROUND_HALF_EVEN
from uuid import UUID
import uuid
import datetime
import calendar
import logging
import asyncio
from typing import List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.dialects.postgresql import insert

from app.models.bill import Bill
from app.models.consumption import Consumption
from app.models.user import User
from app.repositories.bill_repository import BillRepository
from app.core.money import (
    calculate_amount,
    LITER_PRECISION,
    DEFAULT_ROUNDING,
    Money as MoneyObj
)
from app.core.redis import get_redis

logger = logging.getLogger(__name__)

class BillingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.bill_repo = BillRepository(db)

    @staticmethod
    def calculate_month_range(month: str) -> Tuple[datetime.date, datetime.date]:
        """Calculate the start and end dates for a given month string (YYYY-MM)."""
        try:
            year, mon = map(int, month.split("-"))
        except Exception:
            raise ValueError("Invalid month format. Use YYYY-MM")
        last = calendar.monthrange(year, mon)[1]
        return datetime.date(year, mon, 1), datetime.date(year, mon, last)

    async def generate_bill_for_user(
        self, user_id: UUID, month: str, enqueue_pdf: bool = True
    ) -> Optional[Bill]:
        """Generate or update a bill for a user for a specific month."""
        start_date, end_date = self.calculate_month_range(month)
        
        # 1. Fetch User (for price_per_liter)
        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalars().first()
        if not user:
            logger.error(f"Bill generation failed: User {user_id} not found")
            return None

        price = Decimal(str(user.price_per_liter or 0)).quantize(
            Decimal("0.001")
        )

        # 2. Calculate totals from consumption
        consumption_result = await self.db.execute(
            select(func.coalesce(func.sum(Consumption.quantity), 0))
            .where(
                and_(
                    Consumption.user_id == user_id,
                    Consumption.date >= start_date,
                    Consumption.date <= end_date
                )
            )
        )
        total_liters_raw = consumption_result.scalar() or 0
        total_liters = Decimal(str(total_liters_raw)).quantize(
            LITER_PRECISION, rounding=DEFAULT_ROUNDING
        )
        
        money_obj = calculate_amount(total_liters, price)
        total_amount = money_obj.amount

        logger.info(f"Processing {month} for {user.name}: {total_liters}L, total {total_amount}")

        # 3. Upsert Bill
        bill_result = await self.db.execute(
            select(Bill).where(and_(Bill.user_id == user_id, Bill.month == month))
        )
        existing_bill = bill_result.scalars().first()

        if existing_bill:
            if existing_bill.status == "PAID":
                logger.info(f"Bill {existing_bill.id} is PAID. Skipping update.")
                return existing_bill
            
            existing_bill.total_liters = total_liters
            existing_bill.total_amount = total_amount
            existing_bill.updated_at = datetime.datetime.now(datetime.timezone.utc)
            existing_bill.version = (existing_bill.version or 0) + 1
            self.db.add(existing_bill)
            await self.db.commit()
            await self.db.refresh(existing_bill)
            bill = existing_bill
        else:
            if total_liters > 0:
                bill = Bill(
                    user_id=user_id,
                    month=month,
                    total_liters=total_liters,
                    total_amount=total_amount,
                    status="UNPAID",
                    is_locked=False
                )
                self.db.add(bill)
                await self.db.commit()
                await self.db.refresh(bill)
            else:
                return None

        # 4. Enqueue PDF task
        if enqueue_pdf:
            self._enqueue_pdf_task(bill.id)

        return bill

    async def generate_batch_bills(
        self, month: str, skip_paid: bool = True
    ) -> List[Bill]:
        """Generate bills for all active users for a specific month using batch processing."""
        start_date, end_date = self.calculate_month_range(month)

        stmt = (
            select(
                User.id,
                User.name,
                User.price_per_liter,
                func.coalesce(func.sum(Consumption.quantity), 0).label("total_qty")
            )
            .outerjoin(
                Consumption,
                and_(
                    User.id == Consumption.user_id,
                    Consumption.date >= start_date,
                    Consumption.date <= end_date
                )
            )
            .where(User.role == "USER", User.is_active)
            .group_by(User.id, User.name, User.price_per_liter)
        )

        result = await self.db.execute(stmt)
        user_stats = result.all()

        bill_stmt = select(Bill).where(Bill.month == month)
        bills_result = await self.db.execute(bill_stmt)
        existing_bills = {b.user_id: b for b in bills_result.scalars().all()}

        bills_to_upsert = []
        for user_id, name, price_per_liter, total_qty in user_stats:
            existing = existing_bills.get(user_id)
            if skip_paid and existing and existing.status == "PAID":
                continue

            total_liters = Decimal(str(total_qty)).quantize(LITER_PRECISION)
            if total_liters == 0 and not existing:
                continue

            unit_price = Decimal(str(price_per_liter or 0))
            money_obj = calculate_amount(total_liters, unit_price)
            total_amount = money_obj.amount

            bill_data = {
                "id": existing.id if existing else uuid.uuid4(),
                "user_id": user_id,
                "month": month,
                "total_liters": total_liters,
                "total_amount": total_amount,
                "status": existing.status if existing else "UNPAID",
                "updated_at": datetime.datetime.now(datetime.timezone.utc),
                "version": (existing.version or 0) + 1 if existing else 1
            }
            bills_to_upsert.append(bill_data)

        if bills_to_upsert:
            # Batch upsert logic (Dialect dependent)
            # For simplicity and cross-db compatibility, we'll use loop with flush for small batches
            # or specialized logic if it's PostgreSQL.
            for data in bills_to_upsert:
                if any(b.user_id == data["user_id"] for b in existing_bills.values()):
                    b = existing_bills[data["user_id"]]
                    b.total_liters = data["total_liters"]
                    b.total_amount = data["total_amount"]
                    b.updated_at = data["updated_at"]
                    b.version = data["version"]
                    self.db.add(b)
                else:
                    new_bill = Bill(**data)
                    self.db.add(new_bill)
            
            await self.db.commit()
            
            # Enqueue PDF tasks for all processed bills
            for data in bills_to_upsert:
                self._enqueue_pdf_task(data["id"])

        final_result = await self.db.execute(select(Bill).where(Bill.month == month))
        return final_result.scalars().all()

    def _enqueue_pdf_task(self, bill_id: UUID):
        """Helper to enqueue Celery task for PDF generation."""
        try:
            from app.workers.tasks import generate_and_upload_pdf
            generate_and_upload_pdf.delay(str(bill_id))
        except Exception as e:
            logger.warning(f"Failed to enqueue PDF task for bill {bill_id}: {e}")

    async def get_bill_with_pdf(self, bill_id: UUID) -> Optional[Bill]:
        """Get bill and ensure PDF URL is valid/presigned."""
        bill = await self.bill_repo.get_by_id(bill_id)
        if not bill:
            return None

        if bill.pdf_url and not bill.pdf_url.startswith("http"):
            from app.core.config import settings
            from app.services.s3_uploader import generate_presigned_url
            bucket = settings.AWS_BUCKET_NAME or "dairy-bills"
            bill.pdf_url = generate_presigned_url(bucket, bill.pdf_url)

        return bill
