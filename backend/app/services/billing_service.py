from decimal import Decimal
from uuid import UUID
import datetime
from calendar import monthrange
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.bill import Bill
from app.models.consumption import Consumption
from app.models.user import User
from app.core.money import (
    calculate_amount,
    LITER_PRECISION,
    DEFAULT_ROUNDING
)


class BillingService:
    @staticmethod
    async def recalculate_bill(db: AsyncSession, user_id: UUID, month: str) -> Bill:
        """
        Recalculate total liters and amount for a specific user and month.
        Does NOT generate PDF or send notifications.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # 1. Fetch User (for price_per_liter)
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalars().first()
        if not user:
            logger.error(f"Recalculate failed: User {user_id} not found")
            return None

        # 2. Calculate totals from consumption
        year, month_num = map(int, month.split("-"))
        start_date = datetime.date(year, month_num, 1)
        _, last_day = monthrange(year, month_num)
        end_date = datetime.date(year, month_num, last_day)

        consumption_result = await db.execute(
            select(Consumption).where(
                and_(
                    Consumption.user_id == user_id,
                    Consumption.date >= start_date,
                    Consumption.date <= end_date
                )
            )
        )
        consumptions = consumption_result.scalars().all()

        total_liters = Decimal("0.000")
        for c in consumptions:
            qty = Decimal(str(c.quantity)).quantize(
                LITER_PRECISION, rounding=DEFAULT_ROUNDING
            )
            total_liters += qty
        
        unit_price = Decimal(str(user.price_per_liter))
        money_obj = calculate_amount(total_liters, unit_price)
        total_amount = money_obj.amount

        logger.info(f"Recalculating {month} for {user.name}: {total_liters}L, total {total_amount}")

        # 3. Upsert Bill
        bill_result = await db.execute(
            select(Bill).where(and_(Bill.user_id == user_id, Bill.month == month))
        )
        existing_bill = bill_result.scalars().first()

        if existing_bill:
            # Respect locking and payment status
            if existing_bill.status == "PAID":
                return existing_bill
            
            if existing_bill.is_locked:
                logger.info(f"Skipping recalc for locked bill {existing_bill.id}")
                return existing_bill

            existing_bill.total_liters = total_liters
            existing_bill.total_amount = total_amount
            db.add(existing_bill)
            await db.flush()
            logger.info(f"Updated bill {existing_bill.id}")
            return existing_bill
        else:
            # Only create bill if there is consumption or if we force it
            if total_liters > 0:
                new_bill = Bill(
                    user_id=user_id,
                    month=month,
                    total_liters=total_liters,
                    total_amount=total_amount,
                    status="UNPAID"
                )
                db.add(new_bill)
                await db.flush()
                logger.info(f"Created new bill for {user.name}")
                return new_bill
        return None
