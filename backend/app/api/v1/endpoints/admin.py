from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import datetime
from uuid import UUID

from app.api import deps
from app.db.session import get_db
from app.core.config import settings
from app.models.user import User
from app.models.consumption import Consumption
from app.models.consumption_audit import ConsumptionAudit
from app.schemas.consumption import ConsumptionCreate
from app.schemas.bill import Bill as BillSchema

router = APIRouter()

def get_lock_date() -> datetime.date:
    """Calculate the lock date based on LOCK_DAYS setting."""
    return datetime.date.today() - datetime.timedelta(days=settings.LOCK_DAYS)


@router.get("/daily-entry")
async def get_daily_entry(
    selected_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Get all active users with their consumption for a specific date.
    Used by admin daily entry page.
    """
    entry_date = datetime.date.fromisoformat(selected_date)
    lock_date = get_lock_date()

    # Get all active users
    users_result = await db.execute(
        select(User).where(User.role == "USER", User.is_active == True)
    )
    users = users_result.scalars().all()

    # Get consumption for the date
    consumption_result = await db.execute(
        select(Consumption).where(
            and_(
                Consumption.date == entry_date,
                Consumption.user_id.in_([u.id for u in users])
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
            "user_id": str(user.id),
            "user_name": user.name,
            "email": user.email,
            "quantity": float(consumption_map.get(user.id, 0)),
            "is_locked": entry_date < lock_date
        })

    return result


@router.post("/daily-entry")
async def save_daily_entry(
    *,
    db: AsyncSession = Depends(get_db),
    entries: List[dict],
    selected_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Bulk upsert consumption for all users for a specific date.
    Admin can only edit last LOCK_DAYS days.
    """
    entry_date = datetime.date.fromisoformat(selected_date)
    lock_date = get_lock_date()

    # Check if date is locked (older than LOCK_DAYS)
    if entry_date < lock_date:
        raise HTTPException(
            status_code=403,
            detail=f"Cannot modify data older than {settings.LOCK_DAYS} days"
        )

    # Get all users for validation
    users_result = await db.execute(
        select(User).where(User.role == "USER", User.is_active == True)
    )
    users = users_result.scalars().all()
    users_map = {str(u.id): u for u in users}

    updated_count = 0
    created_count = 0

    for entry in entries:
        user_id_str = entry.get("user_id")
        quantity = float(entry.get("quantity", 0))

        if user_id_str not in users_map:
            continue

        user_id = UUID(user_id_str)

        # Check for existing consumption
        existing_result = await db.execute(
            select(Consumption).where(
                and_(
                    Consumption.user_id == user_id,
                    Consumption.date == entry_date
                )
            )
        )
        existing = existing_result.scalars().first()

        if existing:
            old_quantity = existing.quantity
            if float(old_quantity) != quantity:
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

    return {
        "status": "success",
        "message": f"Updated {updated_count} entries, created {created_count} new entries",
        "date": selected_date
    }


@router.get("/audit-logs", response_model=List[dict])
async def get_audit_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Export all audit logs as CSV.
    """
    from app.models.audit_log import AuditLog
    from sqlalchemy import desc
    import csv
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
        "ID", "Action", "Target Type", "Target ID", "User ID", "IP Address", "Timestamp", "Details"
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
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=audit_logs_{datetime.date.today()}.csv"
    return response


@router.get("/payments")
async def get_payments_dashboard(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    status: str = Query(None, pattern="^(PAID|UNPAID)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Admin payments dashboard with filters and aggregations.
    """
    from app.models.bill import Bill
    from sqlalchemy import func

    # Build query
    query = select(Bill).where(Bill.month == month)
    if status:
        query = query.where(Bill.status == status)

    result = await db.execute(query)
    bills = result.scalars().all()

    # Get user details
    users_result = await db.execute(select(User).where(User.role == "USER", User.is_active == True))
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
            "created_at": bill.created_at.isoformat() if bill.created_at else None
        })

        if bill.status == "PAID":
            paid_total += float(bill.total_amount)
        else:
            unpaid_total += float(bill.total_amount)

    # Sort by status (UNPAID first), then by amount
    enriched_bills.sort(key=lambda x: (x["status"] == "PAID", -x["total_amount"]))

    return {
        "bills": enriched_bills,
        "summary": {
            "month": month,
            "total_bills": len(enriched_bills),
            "paid_count": sum(1 for b in enriched_bills if b["status"] == "PAID"),
            "unpaid_count": sum(1 for b in enriched_bills if b["status"] == "UNPAID"),
            "paid_total": paid_total,
            "unpaid_total": unpaid_total
        }
    }


@router.post("/payments/remind/{bill_id}")
async def send_payment_reminder(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
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
    user_result = await db.execute(select(User).where(User.id == bill.user_id))
    user = user_result.scalars().first()

    # In production, this would send an actual email/SMS
    # For now, we just return success
    print(f"Would send payment reminder to {user.email} for bill {bill_id}")

    return {
        "status": "success",
        "message": f"Payment reminder sent to {user.email}"
    }

