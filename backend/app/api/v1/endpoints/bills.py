"""Bills endpoints for DairyOS.

Clean router architecture.
Delegates to BillService and BillRepository.
"""

from typing import Any, List
from uuid import UUID
import logging
import datetime

from fastapi import (
    APIRouter, Depends, HTTPException, BackgroundTasks,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.db.session import get_db
from app.models.bill import Bill
from app.models.user import User
from app.schemas.bill import Bill as BillSchema
from app.services.billing_service import BillingService
from app.repositories.bill_repository import BillRepository


logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate-all")
async def generate_all_bills_endpoint(
    month: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        deps.get_current_active_billing_manager
    ),
) -> Any:
    """Generate bills for all active users (Batch)."""
    service = BillingService(db)
    bills = await service.generate_batch_bills(month)

    return {
        "status": "success",
        "generated": len(bills),
        "message": f"Processed {len(bills)} bills for {month}.",
    }


@router.post("/generate/{user_id}/{month}")
async def generate_bill_endpoint(
    user_id: UUID,
    month: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        deps.get_current_active_billing_manager
    ),
) -> Any:
    """Generate and lock a bill for a specific user."""
    service = BillingService(db)
    bill = await service.generate_bill_for_user(user_id, month, enqueue_pdf=True)
    if not bill:
        raise HTTPException(
            status_code=400,
            detail="No consumption or error in generation",
        )

    # Lock for production integrity
    bill.is_locked = True
    bill.generated_at = datetime.datetime.now(
        datetime.timezone.utc
    )
    db.add(bill)
    await db.commit()

    # Notify and Audit
    from app.services.notification_service import (
        NotificationService,
    )
    from app.services.audit_service import AuditService
    from app.repositories.user_repository import UserRepository

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)

    if user and user.email:
        background_tasks.add_task(
            NotificationService.notify_bill_generated,
            user.email,
            user.name,
            month,
            float(bill.total_amount),
        )

    await AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="GENERATE_BILL",
        target_type="BILL",
        target_id=str(bill.id),
        details={
            "user_id": str(user_id),
            "month": month,
        },
    )

    return {
        "bill_id": str(bill.id),
        "total_amount": float(bill.total_amount),
        "status": "LOCKED",
        "message": "Bill generated, locked and PDF queued.",
    }


@router.get("/{bill_id}/pdf-status")
async def check_pdf_status_endpoint(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        deps.get_current_active_billing_manager
    ),
) -> Any:
    """Check if PDF is generated for a bill."""
    service = BillingService(db)
    bill = await service.get_bill_with_pdf(bill_id)

    if not bill:
        raise HTTPException(
            status_code=404, detail="Bill not found"
        )

    if bill.pdf_url:
        return {
            "status": "completed",
            "pdf_url": bill.pdf_url,
        }

    return {
        "status": "queued",
        "message": "PDF generation in progress",
    }


@router.get("/{user_id}/{month}", response_model=BillSchema)
async def get_bill_endpoint(
    user_id: UUID,
    month: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get a specific bill."""
    admin_roles = ["ADMIN", "BILLING_ADMIN", "SUPERADMIN"]
    if (
        current_user.role not in admin_roles
        and current_user.id != user_id
    ):
        raise HTTPException(
            status_code=403, detail="Not authorized"
        )

    repo = BillRepository(db)
    bill = await repo.get_by_user_and_month(user_id, month)
    if not bill:
        raise HTTPException(
            status_code=404, detail="Bill not found"
        )

    # Resolve signed PDF URL
    service = BillingService(db)
    bill = await service.get_bill_with_pdf(bill.id)
    return bill


@router.get("/", response_model=List[BillSchema])
async def list_bills_endpoint(
    month: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        deps.get_current_active_user
    ),
) -> Any:
    """List bills with filtering and auth visibility."""
    admin_roles = ["ADMIN", "BILLING_ADMIN", "SUPERADMIN"]

    query = select(
        Bill, User.name.label("user_name")
    ).join(User, Bill.user_id == User.id)

    if month:
        query = query.where(Bill.month == month)

    if current_user.role not in admin_roles:
        query = query.where(
            Bill.user_id == current_user.id
        )

    query = query.order_by(Bill.month.desc())

    result = await db.execute(query)
    rows = result.all()

    service = BillingService(db)
    bills = []
    for bill_obj, user_name in rows:
        bill_with_pdf = await service.get_bill_with_pdf(
            bill_obj.id
        )
        bill_data = BillSchema.model_validate(bill_with_pdf)
        bill_data.user_name = (
            str(user_name) if user_name else "Customer"
        )
        bills.append(bill_data)

    return bills
