from typing import Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from calendar import monthrange
import datetime
from uuid import UUID
import json
from decimal import Decimal

from app.api import deps
from app.db.session import get_db
from app.models.bill import Bill
from app.models.consumption import Consumption
from app.models.user import User
from app.schemas.bill import Bill as BillSchema
from app.core.config import settings
from app.core.redis import get_redis
from app.core.money import calculate_amount, LITER_PRECISION, DEFAULT_ROUNDING
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
        url = upload_file_to_s3(pdf_buffer, bucket_name, file_name)

        # Update Bill with S3 key (not signed URL)
        bill.pdf_url = file_name
        db.add(bill)
        await db.commit()


@router.post("/generate-all")
async def generate_all_bills(
    month: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Generate bills for all active users for a specific month.
    Returns 202 Accepted as PDF generation is queued asynchronously.
    """
    # 1. Get all active users
    users_result = await db.execute(select(User).where(User.role == "USER", User.is_active))
    users = users_result.scalars().all()

    if not users:
        return {"status": "success", "count": 0, "message": "No active users found"}

    year, month_num = map(int, month.split("-"))
    start_date = datetime.date(year, month_num, 1)
    _, last_day = monthrange(year, month_num)
    end_date = datetime.date(year, month_num, last_day)

    # 2. Bulk fetch all consumption for the month
    consumption_result = await db.execute(
        select(Consumption).where(
            and_(
                Consumption.date >= start_date,
                Consumption.date <= end_date
            )
        )
    )
    all_consumptions = consumption_result.scalars().all()

    # Map consumption by user_id
    consumption_map: dict[UUID, Decimal] = {}
    for c in all_consumptions:
        if c.user_id not in consumption_map:
            consumption_map[c.user_id] = Decimal("0.000")
        qty = Decimal(str(c.quantity)).quantize(
            LITER_PRECISION, rounding=DEFAULT_ROUNDING
        )
        consumption_map[c.user_id] += qty

    count = 0
    for user in users:
        total_liters = consumption_map.get(user.id, Decimal("0.000"))
        unit_price = Decimal(str(user.price_per_liter))
        # Use centralized Money utility for rounding
        money_obj = calculate_amount(total_liters, unit_price)
        total_amount = money_obj.amount

        # Upsert Bill
        bill_result = await db.execute(
            select(Bill).where(and_(Bill.user_id == user.id, Bill.month == month))
        )
        existing_bill = bill_result.scalars().first()

        bill_id = None
        if existing_bill:
            if existing_bill.status == "PAID":
                continue  # Don't update paid bills
            existing_bill.total_liters = total_liters
            existing_bill.total_amount = total_amount
            existing_bill.pdf_url = None  # Reset for regeneration
            db.add(existing_bill)
            await db.flush()
            bill_id = existing_bill.id
        else:
            new_bill = Bill(
                user_id=user.id,
                month=month,
                total_liters=total_liters,
                total_amount=total_amount,
                status="UNPAID"
            )
            db.add(new_bill)
            await db.flush()
            bill_id = new_bill.id

        # Dispatch PDF generation
        try:
            r = get_redis()
            generate_invoice_task.delay(str(bill_id))
        except Exception:
            background_tasks.add_task(generate_pdf_task, bill_id)
        count += 1

    await db.commit()

    return Response(
        status_code=202,
        content=json.dumps({
            "status": "queued",
            "count": count,
            "message": f"Bill generation started for {count} users. PDFs will be ready in 1-2 minutes."
        }),
        media_type="application/json"
    )


@router.post("/generate/{user_id}/{month}")
async def generate_bill(
    user_id: UUID,
    month: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Generate or regenerate a bill for a specific user and month.
    Returns 202 Accepted as PDF generation is queued asynchronously.
    """
    # 1. Fetch User
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Calculate totals
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
    # Use centralized Money utility for rounding
    money_obj = calculate_amount(total_liters, unit_price)
    total_amount = money_obj.amount

    # 3. Upsert Bill
    bill_result = await db.execute(
        select(Bill).where(and_(Bill.user_id == user_id, Bill.month == month))
    )
    existing_bill = bill_result.scalars().first()

    if existing_bill:
        if existing_bill.status == "PAID":
            raise HTTPException(status_code=400, detail="Cannot regenerate a paid bill")
        existing_bill.total_liters = total_liters
        existing_bill.total_amount = total_amount
        existing_bill.pdf_url = None  # Reset for regeneration
        db.add(existing_bill)
        await db.flush()
        bill_id = existing_bill.id
    else:
        new_bill = Bill(
            user_id=user_id,
            month=month,
            total_liters=total_liters,
            total_amount=total_amount,
            status="UNPAID"
        )
        db.add(new_bill)
        await db.flush()
        bill_id = new_bill.id

    await db.commit()

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
        r = get_redis()
        generate_invoice_task.delay(str(bill_id))
    except Exception:
        background_tasks.add_task(generate_pdf_task, bill_id)

    # 7. Return 202 Accepted
    return Response(
        status_code=202,
        content=json.dumps({
            "status": "queued",
            "job": "pdf_generation",
            "bill_id": str(bill_id),
            "message": "PDF generation started. Customer will be notified."
        }),
        media_type="application/json"
    )


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
    if current_user.role != "ADMIN" and current_user.id != user_id:
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
    if current_user.role == "ADMIN" or current_user.role == "SUPERADMIN":
        result = await db.execute(select(Bill).where(Bill.month == month))
    else:
        result = await db.execute(
            select(Bill).where(and_(Bill.month == month, Bill.user_id == current_user.id))
        )
    bills = result.scalars().all()

    # Generate presigned URLs for PDFs
    for bill in bills:
        if bill.pdf_url and not bill.pdf_url.startswith("http"):
            bucket_name = settings.AWS_BUCKET_NAME or "dairy-invoices-dev"
            bill.pdf_url = generate_presigned_url(bucket_name, bill.pdf_url)

    return bills
