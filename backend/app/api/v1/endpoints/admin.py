import csv
import logging
from calendar import monthrange
from datetime import date, datetime, timedelta
from typing import Any, List, Annotated
from uuid import UUID


from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks

from app.api import deps
from app.core.config import settings
from app.db.session import get_db, SessionLocal
from app.models.consumption import Consumption
from app.models.consumption_audit import ConsumptionAudit
from app.models.user import User
from app.schemas.common import StatusResponse
from app.services.billing_service import BillingService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_lock_date() -> date:
    """Calculate the lock date based on LOCK_DAYS setting."""
    return date.today() - timedelta(days=settings.LOCK_DAYS)


async def recalculate_all_bills_task(month: str):
    """
    Background task to recalculate bills for ALL users for a specific month.
    """
    logger.info(f"Starting background (DairyDay) bill recalculation for {month}")
    async with SessionLocal() as db:
        try:
            service = BillingService(db)
            await service.generate_batch_bills(month, skip_paid=True)
            await db.commit()
            msg = f"Background bill calculation completed for {month}"
            logger.info(msg)
        except Exception as e:
            msg = f"Background bill calculation failed for {month}: {e}"
            logger.error(msg)


@router.get("/daily-entry")
async def get_daily_entry(
    selected_date: Annotated[str, Query(pattern=r"^\d{4}-\d{2}-\d{2}$")],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_admin)],
) -> Any:
    """
    Get all active users with their consumption for a specific date.
    Used by admin daily entry page.
    """
    logger.info(f"Fetching daily entry for {selected_date}")
    entry_date = date.fromisoformat(selected_date)
    lock_date = get_lock_date()

    # Get all active users
    users_result = await db.execute(
        select(User).where(User.role == "USER", User.is_active)
    )
    users = users_result.scalars().all()
    logger.info(f"Found {len(users)} active users")

    # Get consumption for the date
    consumption_result = await db.execute(
        select(Consumption).where(
            and_(
                Consumption.date == entry_date,
                Consumption.user_id.in_([u.id for u in users])
                if users else False
            )
        )
    )
    consumptions = consumption_result.scalars().all()

    # Map consumption by user_id
    consumption_map = {c.user_id: c.quantity for c in consumptions}

    # Build response
    result = []
    for user in users:
        result.append({
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "liters": float(consumption_map.get(user.id, user.daily_target_qty)),
            "is_locked": entry_date < lock_date
        })

    return result


@router.post("/daily-entry")
async def save_daily_entry(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    entries: List[dict],
    selected_date: Annotated[str, Query(pattern=r"^\d{4}-\d{2}-\d{2}$")],
    current_user: Annotated[User, Depends(deps.get_current_active_admin)],
    background_tasks: BackgroundTasks,
) -> Any:
    """
    Bulk upsert consumption for all users for a specific date.
    Admin can only edit last LOCK_DAYS days.
    """
    entry_date = date.fromisoformat(selected_date)
    lock_date = get_lock_date()

    # Check if date is locked (older than LOCK_DAYS)
    if entry_date < lock_date:
        raise HTTPException(
            status_code=403,
            detail=f"Cannot modify data older than {settings.LOCK_DAYS} days"
        )

    # Get all users for validation
    users_result = await db.execute(
        select(User).where(User.role == "USER", User.is_active)
    )
    users = users_result.scalars().all()
    user_uuids = [u.id for u in users]

    # Bulk fetch existing consumption for all users on this date
    existing_result = await db.execute(
        select(Consumption).where(
            and_(
                Consumption.date == entry_date,
                Consumption.user_id.in_(user_uuids)
            )
        )
    )
    existing_map = {c.user_id: c for c in existing_result.scalars().all()}

    updated_count = 0
    created_count = 0
    
    # We will trigger recalc for the month of the entry_date
    month_str = entry_date.strftime("%Y-%m")

    for entry in entries:
        user_id_str = entry.get("user_id")
        if not user_id_str:
            continue
            
        user_id = UUID(user_id_str)
        quantity = float(entry.get("liters", 0))

        # Basic validation: ensure non-negative and realistic amount
        if quantity < 0:
            msg = f"Rejected negative quantity {quantity} for user {user_id}"
            logger.warning(msg)
            continue
        if quantity > 1000:  # Sanity check for a single user's delivery
            msg = f"Rejected excessive quantity {quantity} for user {user_id}"
            logger.warning(msg)
            continue

        existing = existing_map.get(user_id)

        if existing:
            old_quantity = float(existing.quantity)
            if old_quantity != quantity:
                existing.quantity = quantity
                db.add(existing)

                # Audit log
                db.add(ConsumptionAudit(
                    user_id=user_id,
                    admin_id=current_user.id,
                    date=entry_date,
                    old_quantity=old_quantity,
                    new_quantity=quantity,
                ))
            updated_count += 1
        else:
            if quantity > 0:  # Only create if there's consumption
                new_consumption = Consumption(
                    user_id=user_id,
                    date=entry_date,
                    quantity=quantity
                )
                db.add(new_consumption)

                # Update existing_map so dupes in input don't create dupes in DB
                existing_map[user_id] = new_consumption

                # Audit log
                db.add(ConsumptionAudit(
                    user_id=user_id,
                    admin_id=current_user.id,
                    date=entry_date,
                    old_quantity=None,
                    new_quantity=quantity,
                ))
            created_count += 1

    await db.commit()

    # Trigger background task to recalculate ALL bills for this month
    background_tasks.add_task(recalculate_all_bills_task, month_str)

    # Invalidate Cache
    try:
        from app.core.redis import get_redis
        redis = await get_redis()
        if redis:
            await redis.delete(f"grid:{month_str}")
    except Exception:
        pass

    msg = (
        f"Updated {updated_count}, created {created_count}. "
        f"Background bill update triggered for {month_str}."
    )
    return {
        "status": "success",
        "message": msg,
        "date": selected_date
    }



@router.get("/audit-logs", response_model=List[dict])
async def get_audit_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_admin)],
) -> Any:
    """
    Retrieve all audit logs for admin review.
    """
    from app.models.audit_log import AuditLog
    from sqlalchemy import desc

    result = await db.execute(
        select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(500)
    )
    logs = result.scalars().all()

    # Simple serialization
    return [
        {
            "id": str(log.id),
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "user_id": str(log.user_id) if log.user_id else None
        } for log in logs
    ]


@router.get("/audit-logs/export")
async def export_audit_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_admin)],
) -> Any:
    """
    Export all audit logs as CSV.
    """
    from app.models.audit_log import AuditLog
    from sqlalchemy import desc
    import io
    from fastapi.responses import StreamingResponse

    result = await db.execute(
        select(AuditLog).order_by(desc(AuditLog.timestamp))
    )
    logs = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "ID", "Action", "Target Type", "Target ID",
        "User ID", "IP Address", "Timestamp", "Details"
    ])

    for log in logs:
        writer.writerow([
            str(log.id),
            log.action,
            log.target_type,
            log.target_id,
            str(log.user_id) if log.user_id else "System",
            log.ip_address,
            log.timestamp.isoformat() if log.timestamp else "",
            str(log.details)
        ])

    output.seek(0)
    response = StreamingResponse(
        iter([output.getvalue()]), media_type="text/csv"
    )
    filename = f"audit_logs_{datetime.date.today()}.csv"
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response


@router.get("/payments")
async def get_payments_dashboard(
    month: Annotated[str, Query(pattern=r"^\d{4}-\d{2}$")],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_admin)],
    status: Annotated[str | None, Query(pattern="^(PAID|UNPAID)$")] = None,
) -> Any:
    """
    Admin payments dashboard with filters and aggregations.
    """
    from app.models.bill import Bill

    # Build query
    query = select(Bill).where(Bill.month == month)
    if status:
        query = query.where(Bill.status == status)

    result = await db.execute(query)
    bills = result.scalars().all()

    # Get user details (including inactive ones)
    users_result = await db.execute(
        select(User).where(User.role == "USER")
    )
    users = users_result.scalars().all()
    users_map = {str(u.id): u.name for u in users}

    # Build response with user names
    enriched_bills = []
    paid_total = 0
    unpaid_total = 0

    for bill in bills:
        enriched_bills.append({
            "id": str(bill.id),
            "user_id": str(bill.user_id),
            "user_name": users_map.get(str(bill.user_id), "Unknown"),
            "month": bill.month,
            "total_liters": float(bill.total_liters),
            "total_amount": float(bill.total_amount),
            "status": bill.status,
            "pdf_url": bill.pdf_url,
            "created_at": (
                bill.created_at.isoformat() if bill.created_at else None
            )
        })

        if bill.status == "PAID":
            paid_total += float(bill.total_amount)
        else:
            unpaid_total += float(bill.total_amount)

    # Sort by status (UNPAID first), then by amount
    enriched_bills.sort(
        key=lambda x: (x["status"] == "PAID", -x["total_amount"])
    )

    return {
        "bills": enriched_bills,
        "summary": {
            "month": month,
            "total_bills": len(enriched_bills),
            "paid_count": sum(
                1 for b in enriched_bills if b["status"] == "PAID"
            ),
            "unpaid_count": sum(
                1 for b in enriched_bills if b["status"] == "UNPAID"
            ),
            "paid_total": paid_total,
            "unpaid_total": unpaid_total
        }
    }


@router.post("/payments/remind/{bill_id}")
async def send_payment_reminder(
    bill_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_admin)],
) -> Any:
    """
    Send payment reminder to user for an unpaid bill.
    """
    from app.models.bill import Bill

    result = await db.execute(select(Bill).where(Bill.id == bill_id))
    bill = result.scalars().first()

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    if bill.status == "PAID":
        raise HTTPException(status_code=400, detail="Bill is already paid")

    # Get user for email
    user_result = await db.execute(
        select(User).where(User.id == bill.user_id)
    )
    user = user_result.scalars().first()

    # In production, this would send an actual email/SMS
    # For now, we just return success
    print(
        f"Would send payment reminder to {user.email} for bill {bill_id}"
    )

    return {
        "status": "success",
        "message": f"Reminder sent to {user.email}"
    }


@router.post("/payments/remind-bulk/{month}")
async def send_bulk_payment_reminders(
    month: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_admin)],
) -> Any:
    """
    Send payment reminders to ALL users with unpaid bills for a specific month.
    """
    from app.models.bill import Bill

    # Find all unpaid bills for the month
    result = await db.execute(
        select(Bill).where(
            and_(
                Bill.month == month,
                Bill.status == "UNPAID"
            )
        )
    )
    unpaid_bills = result.scalars().all()

    if not unpaid_bills:
        return {
            "status": "success",
            "message": f"No unpaid bills found for {month}",
            "count": 0
        }

    # In production, this would trigger a background task
    # For now, we simulate sending
    user_ids = [b.user_id for b in unpaid_bills]
    msg = f"Bulk reminder triggered for {len(user_ids)} users for {month}"
    logger.info(msg)

    return {
        "status": "success",
        "message": f"Reminders queued for {len(unpaid_bills)} users",
        "count": len(unpaid_bills)
    }


@router.post("/lock", response_model=StatusResponse)
async def lock_consumption_period(
    month: Annotated[str, Query(pattern=r"^\d{4}-\d{2}$")],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_admin)],
    user_id: UUID | None = None,
) -> Any:
    """Explicitly lock consumption for a month."""
    year, month_num = map(int, month.split("-"))
    start_date = date(year, month_num, 1)
    _, last_day = monthrange(year, month_num)
    end_date = date(year, month_num, last_day)

    query = select(Consumption).where(
        and_(
            Consumption.date >= start_date,
            Consumption.date <= end_date
        )
    )

    if user_id:
        query = query.where(Consumption.user_id == user_id)

    result = await db.execute(query)
    consumptions = result.scalars().all()

    for c in consumptions:
        c.locked = True
        db.add(c)
    
    await db.commit()
    return {
        "status": "success",
        "message": f"Locked {len(consumptions)} records for {month}"
    }
