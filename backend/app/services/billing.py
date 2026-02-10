"""
Billing service for DairyOS.
Handles bill calculation and generation logic with proper Decimal precision.
Uses centralized Money utilities from app.core.money for monetary correctness.
"""

from decimal import Decimal, ROUND_HALF_EVEN
from datetime import datetime, date
import calendar
from typing import Tuple, List
from uuid import UUID
import logging
import uuid
import asyncio

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.money import Money
from app.core.redis import get_redis
from app.models.user import User
from app.models.consumption import Consumption
from app.models.bill import Bill

# Import PDF generator at module level for testing compatibility
from app.workers import tasks as celery_tasks
celery_tasks_module = celery_tasks

logger = logging.getLogger(__name__)


class BillGenerationError(Exception):
    """Raised when bill generation fails."""
    pass


class ConcurrentModificationError(BillGenerationError):
    """Raised when bill is modified by another process during update."""
    pass


def calculate_month_range(month: str) -> Tuple[date, date]:
    """Calculate the start and end dates for a given month string (YYYY-MM)."""
    try:
        year, mon = map(int, month.split("-"))
    except Exception:
        raise ValueError("Invalid month format. Use YYYY-MM")
    last = calendar.monthrange(year, mon)[1]
    return date(year, mon, 1), date(year, mon, last)


def calculate_bill_amount(total_liters: Decimal, price_per_liter: Decimal) -> Decimal:
    """Calculate the total bill amount with proper Decimal precision (banker's rounding).

    Uses ROUND_HALF_EVEN (banker's rounding) for financial accuracy.
    """
    amount = total_liters * price_per_liter
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)


async def _acquire_bill_lock(redis, user_id: UUID, month: str, timeout: int = 300) -> tuple[bool, str]:
    """Acquire a distributed lock for bill generation.

    Args:
        redis: Redis client
        user_id: The user ID
        month: The billing month
        timeout: Lock timeout in seconds

    Returns:
        Tuple of (lock_acquired, lock_value)
    """
    lock_key = f"bill:generate:{user_id}:{month}"
    lock_value = str(uuid.uuid4())

    # Use SET NX EX for atomic acquire with expiry
    lock_acquired = redis.set(lock_key, lock_value, nx=True, ex=timeout)

    return lock_acquired, lock_value


async def _release_bill_lock(redis, lock_key: str, lock_value: str) -> bool:
    """Release a distributed lock for bill generation.

    Only releases if the value matches (to prevent releasing another process's lock).

    Args:
        redis: Redis client
        lock_key: The lock key
        lock_value: The expected lock value

    Returns:
        True if lock was released, False otherwise
    """
    # Lua script for atomic check-and-delete
    lua_script = """
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
    """
    try:
        result = redis.eval(lua_script, 1, lock_key, lock_value)
        return result == 1
    except Exception:
        logger.warning("Failed to release bill generation lock: %s", lock_key)
        return False


async def generate_bill_for_user(
    db: AsyncSession,
    user_id: UUID,
    month: str,
    enqueue_pdf: bool = True
) -> Bill:
    """Generate or update a bill for a user for a specific month.

    Uses distributed locking to ensure idempotent bill generation across
    concurrent workers. If another worker is generating the same bill,
    this function will wait briefly and then return the existing bill.

    Args:
        db: Database session
        user_id: The user ID
        month: Billing month in YYYY-MM format
        enqueue_pdf: Whether to enqueue PDF generation

    Returns:
        The generated or updated Bill

    Raises:
        BillGenerationError: If bill generation fails
    """
    start_date, end_date = calculate_month_range(month)

    # Load user with price fallback
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalars().first()

    if not user:
        raise ValueError("User not found")

    # Defensive: Handle NULL price_per_liter
    price = Decimal(str(user.price_per_liter or 0)).quantize(Decimal("0.001"))

    # Sum consumption with coalesce to handle NULLs
    consumption_result = await db.execute(
        select(func.coalesce(func.sum(Consumption.quantity), 0))
        .where(
            Consumption.user_id == user_id,
            Consumption.date >= start_date,
            Consumption.date <= end_date
        )
    )
    total_liters_raw = consumption_result.scalar() or 0
    total_liters = Decimal(str(total_liters_raw)).quantize(Decimal("0.001"))

    # Compute total amount with banker's rounding
    total_amount = calculate_bill_amount(total_liters, price)

    # Acquire distributed lock for idempotency
    redis = None
    lock_acquired = False
    lock_key = None
    lock_value = None

    try:
        try:
            redis = get_redis()
            lock_acquired, lock_value = await _acquire_bill_lock(redis, user_id, month)
        except Exception as lock_err:
            logger.warning("Could not acquire bill generation lock: %s", lock_err)
            # Continue without lock if Redis is unavailable

        if not lock_acquired:
            # Another worker is generating this bill, wait briefly and retry once
            await asyncio.sleep(0.5)

            # Try to fetch the bill again
            bill_result = await db.execute(
                select(Bill).where(Bill.user_id == user_id, Bill.month == month)
            )
            existing_bill = bill_result.scalars().first()
            if existing_bill:
                logger.debug("Returning existing bill (lock not acquired): %s", existing_bill.id)
                return existing_bill

            # If still not found, another worker had the lock but failed
            # Proceed with generation
            logger.info("Proceeding with bill generation after lock timeout")

        # Upsert bill
        bill_result = await db.execute(
            select(Bill).where(Bill.user_id == user_id, Bill.month == month)
        )
        bill = bill_result.scalars().first()

        if bill:
            # Use optimistic locking with version check
            if hasattr(bill, 'version'):
                stmt = (
                    update(Bill)
                    .where(Bill.id == bill.id, Bill.version == bill.version)
                    .values(
                        total_liters=total_liters,
                        total_amount=total_amount,
                        version=bill.version + 1,
                        updated_at=datetime.utcnow()
                    )
                )
                result = await db.execute(stmt)
                if result.rowcount == 0:
                    raise ConcurrentModificationError(
                        f"Bill {bill.id} was modified by another process"
                    )
                await db.commit()
                await db.refresh(bill)
            else:
                # Fallback without optimistic locking
                bill.total_liters = total_liters
                bill.total_amount = total_amount
                if bill.status != "PAID":
                    bill.status = "UNPAID"
                bill.updated_at = datetime.utcnow()
                db.add(bill)
                await db.commit()
                await db.refresh(bill)
        else:
            # Create new bill
            bill = Bill(
                user_id=user_id,
                month=month,
                total_liters=total_liters,
                total_amount=total_amount,
                status="UNPAID"
            )
            db.add(bill)
            await db.commit()
            await db.refresh(bill)

        logger.info(
            "Bill generated: %s for user %s month %s (₹%.2f)",
            bill.id, user_id, month, total_amount
        )

    finally:
        # Release lock
        if redis and lock_acquired and lock_key:
            await _release_bill_lock(redis, lock_key, lock_value)

    # Enqueue PDF generation
    if enqueue_pdf:
        try:
            # Use module-level reference for testability
            task_func = getattr(celery_tasks_module, 'generate_and_upload_pdf', None)
            if task_func and hasattr(task_func, 'delay'):
                task_func.delay(str(bill.id))
            else:
                # Fallback: lazy import
                from app.workers.tasks import generate_and_upload_pdf
                generate_and_upload_pdf.delay(str(bill.id))
        except Exception as exc:
            logger.exception("Failed to enqueue PDF task: %s", exc)

    return bill


async def generate_all_bills(
    db: AsyncSession,
    month: str,
    skip_paid: bool = True
) -> list[Bill]:
    """Generate bills for all active users for a specific month.

    Args:
        db: Database session
        month: Billing month in YYYY-MM format
        skip_paid: Whether to skip users with already paid bills

    Returns:
        List of generated bills
    """
    users_result = await db.execute(
        select(User).where(User.role == "USER", User.is_active)
    )
    users = users_result.scalars().all()

    bills: List[Bill] = []
    errors: List[dict] = []

    for user in users:
        try:
            if skip_paid:
                bill_check = await db.execute(
                    select(Bill).where(
                        Bill.user_id == user.id,
                        Bill.month == month,
                        Bill.status == "PAID"
                    )
                )
                if bill_check.scalars().first():
                    continue

            bill = await generate_bill_for_user(db, user.id, month)
            bills.append(bill)
        except Exception as e:
            errors.append({"user_id": str(user.id), "error": str(e)})
            logger.error("Failed to generate bill for user %s: %s", user.id, e)

    if errors:
        logger.warning("Bill generation completed with %d errors", len(errors))

    logger.info("Bill generation complete: %d bills, %d errors", len(bills), len(errors))

    return bills


def format_currency(amount: Decimal) -> str:
    """Format a Decimal amount as an Indian Rupee string.

    Uses the centralized money utility for consistency.
    """
    money = Money(amount)
    return money.to_str()

