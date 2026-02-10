from typing import Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from calendar import monthrange
import datetime
from uuid import UUID
from decimal import Decimal

from app.api import deps
from app.db.session import get_db
from app.models.bill import Bill
from app.models.consumption import Consumption
from app.models.user import User
from app.schemas.bill import Bill as BillSchema
from app.core.config import settings
from app.workers.celery_app import generate_invoice_task
from app.services.s3_uploader import generate_presigned_url

router = APIRouter()



async def generate_pdf_task(bill_id: UUID):
    """Background task for PDF generation."""
    from app.db.session import SessionLocal
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import text
    from app.services.pdf_generator import generate_invoice_pdf
    from app.services.s3_uploader import upload_file_to_s3

    async def _get_session():
        try:
            session = SessionLocal()
            async with session as db:
                await db.execute(text("SELECT 1"))
                return session
        except Exception:
            fallback_engine = create_async_engine("sqlite+aiosqlite:///./dairy.db", future=True, echo=False)
            FallbackSessionLocal = sessionmaker(bind=fallback_engine, class_=AsyncSession, expire_on_commit=False)
            async with fallback_engine.begin() as conn:
                from app.db.base import Base
                await conn.run_sync(Base.metadata.create_all)
            return FallbackSessionLocal()

    async with await _get_session() as db:
        result = await db.execute(select(Bill).where(Bill.id == bill_id))
        bill = result.scalars().first()

        if not bill:
            return

        user_result = await db.execute(select(User).where(User.id == bill.user_id))
        user = user_result.scalars().first()

        if not user:
            return

        # Fetch consumptions for PDF
        year, month_num = map(int, bill.month.split("-"))
        start_date = datetime.date(year, month_num, 1)
        _, last_day = monthrange(year, month_num)
        end_date = datetime.date(year, month_num, last_day)

        consumption_result = await db.execute(
            select(Consumption).where(
                and_(
                    Consumption.user_id == user.id,
                    Consumption.date >= start_date,
                    Consumption.date <= end_date
                )
            ).order_by(Consumption.date)
        )
        consumptions = consumption_result.scalars().all()

        # Generate PDF
        pdf_buffer = generate_invoice_pdf(user, bill, consumptions)

        # Upload to S3
        file_name = f"invoices/{bill.month}/{user.id}.pdf"
        bucket_name = settings.AWS_BUCKET_NAME or "dairy-invoices-dev"
        upload_file_to_s3(pdf_buffer, bucket_name, file_name)

        # Update Bill with S3 key (not signed URL)
        bill.pdf_url = file_name
        db.add(bill)
        await db.commit()


@router.post("/generate-all")
async def generate_all_bills(
    month: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_billing_manager),
) -> Any:
    """
    Generate bills for all active users for a specific month.
    Locks the bills upon generation.
    Returns 202 Accepted.
    """
    # 1. Get all active users
    users_result = await db.execute(select(User).where(User.role == "USER", User.is_active))
    users = users_result.scalars().all()

    if not users:
        return {"status": "success", "count": 0, "message": "No active users found"}

    from app.services.billing_service import BillingService

    count = 0
    generated_count = 0
    skipped_count = 0
    
    for user in users:
        # Check if bill exists and is locked
        bill_result = await db.execute(
            select(Bill).where(and_(Bill.user_id == user.id, Bill.month == month))
        )
        existing_bill = bill_result.scalars().first()

        if existing_bill and existing_bill.is_locked:
            skipped_count += 1
            continue

        # Recalculate (creates or updates UNPAID/unlocked bill)
        bill = await BillingService.recalculate_bill(db, user.id, month)
        
        if bill:
            # Lock the bill
            bill.is_locked = True
            bill.generated_at = datetime.datetime.now(datetime.timezone.utc)
            db.add(bill)
            await db.flush()
            
            # Dispatch PDF generation
            try:
                generate_invoice_task.delay(str(bill.id))
            except Exception:
                background_tasks.add_task(generate_pdf_task, bill.id)
            
            generated_count += 1
        
        count += 1

    await db.commit()

    return {
        "status": "success",
        "generated": generated_count,
        "skipped": skipped_count,
        "message": f"Generated {generated_count} bills. Skipped {skipped_count} locked bills."
    }


@router.post("/generate/{user_id}/{month}")
async def generate_bill(
    user_id: UUID,
    month: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_billing_manager),
) -> Any:
    """
    Generate a bill for a specific user and month.
    Locks the bill.
    """
    # 1. Fetch User
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check lock status first
    bill_result = await db.execute(
        select(Bill).where(and_(Bill.user_id == user_id, Bill.month == month))
    )
    existing_bill = bill_result.scalars().first()
    if existing_bill and existing_bill.is_locked:
         raise HTTPException(status_code=400, detail="Bill is already generated and locked.")

    # 2. Use BillingService to recalculate
    from app.services.billing_service import BillingService
    bill = await BillingService.recalculate_bill(db, user_id, month)
    
    if not bill:
        raise HTTPException(status_code=400, detail="No consumption found to generate bill")

    # Lock it
    bill.is_locked = True
    bill.generated_at = datetime.datetime.now(datetime.timezone.utc)
    db.add(bill)
    await db.commit()

    total_liters = bill.total_liters
    total_amount = bill.total_amount
    bill_id = bill.id

    # 4. Notify User (Fire and forget or awaited)
    from app.services.notification_service import NotificationService
    from app.services.audit_service import AuditService

    if user.email:
        background_tasks.add_task(
            NotificationService.notify_bill_generated,
            user.email,
            user.name,
            month,
            float(total_amount)
        )

    # 5. Record Audit
    await AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="GENERATE_BILL",
        target_type="BILL",
        target_id=str(bill_id),
        details={"user_id": str(user_id), "month": month, "amount": float(total_amount)}
    )
    await db.commit()

    # 6. Queue PDF generation (async)
    try:
        generate_invoice_task.delay(str(bill_id))
    except Exception:
        background_tasks.add_task(generate_pdf_task, bill_id)

    # 7. Return summary for tests to verify
    return {
        "bill_id": str(bill_id),
        "total_liters": float(total_liters),
        "total_amount": float(total_amount),
        "status": "UNPAID",
        "message": "Bill generated and locked. PDF queued."
    }


@router.get("/{bill_id}/pdf-status")
async def check_pdf_status(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_billing_manager),
) -> Any:
    """
    Check if PDF is generated for a bill.
    """
    result = await db.execute(select(Bill).where(Bill.id == bill_id))
    bill = result.scalars().first()
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
        
    if bill.pdf_url:
        # Generate signed URL
        url = bill.pdf_url
        if not url.startswith("http"):
            bucket_name = settings.AWS_BUCKET_NAME or "dairy-invoices-dev"
            url = generate_presigned_url(bucket_name, bill.pdf_url)
            
        return {
            "status": "completed",
            "pdf_url": url
        }
    else:
        return {
            "status": "queued",
            "message": "PDF is being generated..."
        }


@router.get("/{user_id}/{month}", response_model=BillSchema)
async def get_bill(
    user_id: UUID,
    month: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get a specific bill. Users can only see their own bills.
    """
    # Users can only see their own bills
    if current_user.role not in ["ADMIN", "BILLING_ADMIN", "SUPERADMIN"] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(Bill).where(and_(Bill.user_id == user_id, Bill.month == month))
    )
    bill = result.scalars().first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    # Generate signed URL if pdf_url is present and is an S3 key (not already a URL)
    if bill.pdf_url and not bill.pdf_url.startswith("http"):
        bucket_name = settings.AWS_BUCKET_NAME or "dairy-invoices-dev"
        bill.pdf_url = generate_presigned_url(bucket_name, bill.pdf_url)

    return bill


@router.get("/", response_model=list[BillSchema])
async def list_bills(
    month: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    List all bills for a specific month.
    Admins can see all, users only their own.
    """
    if current_user.role in ["ADMIN", "BILLING_ADMIN", "SUPERADMIN"]:
        # Join with User to get names
        query = (
            select(Bill, User.name.label("user_name"))
            .join(User, Bill.user_id == User.id)
            .where(Bill.month == month)
        )
    else:
        query = (
            select(Bill, User.name.label("user_name"))
            .join(User, Bill.user_id == User.id)
            .where(and_(Bill.month == month, Bill.user_id == current_user.id))
        )
    
    result = await db.execute(query)
    rows = result.all()
    
    bills = []
    bucket_name = settings.AWS_BUCKET_NAME or "dairy-invoices-dev"
    
    for bill_obj, user_name in rows:
        # Generate presigned URLs for PDFs if needed
        if bill_obj.pdf_url and not bill_obj.pdf_url.startswith("http"):
            bill_obj.pdf_url = generate_presigned_url(bucket_name, bill_obj.pdf_url)
        
        # Create schema object from DB object
        bill_data = BillSchema.model_validate(bill_obj)
        bill_data.user_name = str(user_name) if user_name else "Guest Customer"
        bills.append(bill_data)

    return bills

