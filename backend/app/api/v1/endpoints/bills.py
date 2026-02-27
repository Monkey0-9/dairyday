"""Bills endpoints for DairyOS.

Clean router architecture.
Delegates to BillService and BillRepository.
"""

from typing import Any
from uuid import UUID
import logging
import datetime
from decimal import Decimal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    BackgroundTasks,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.services.billing_service import BillingService

from app.api import deps
from app.db.session import get_db
from app.models.bill import Bill
from app.models.user import User
from app.repositories.bill_repository import BillRepository
from app.schemas.bill import (
    Bill as BillModel,
    BillSummary,
    BillListResponse,
    BillUtrSubmission,
    BulkBillActionRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _resolve_pdf_url(bill: Bill) -> None:
    """Resolve presigned PDF URL in-place without extra DB query."""
    if bill.pdf_url and not bill.pdf_url.startswith("http"):
        from app.core.config import settings
        from app.services.s3_uploader import generate_presigned_url

        bucket = settings.AWS_BUCKET_NAME or "dairy-bills"
        bill.pdf_url = generate_presigned_url(bucket, bill.pdf_url)


@router.post("/generate-all")
async def generate_all_bills_endpoint(
    month: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_billing_manager),
    idempotency_key: str = Depends(deps.require_idempotency_key),
) -> Any:
    """Generate bills for all active users (Batch)."""
    service = BillingService(db)
    generated_bills = await service.generate_batch_bills(month)

    return {
        "status": "success",
        "generated": len(generated_bills),
        "message": f"Processed {len(generated_bills)} bills for {month}.",
    }


@router.post("/generate/{user_id}/{month}")
async def generate_bill_endpoint(
    user_id: UUID,
    month: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_billing_manager),
    idempotency_key: str = Depends(deps.require_idempotency_key),
) -> Any:
    """Generate and lock a bill for a specific user."""
    service = BillingService(db)
    bill = await service.generate_bill_for_user(
        user_id, month, enqueue_pdf=True
    )
    if not bill:
        raise HTTPException(
            status_code=400,
            detail="No consumption or error in generation",
        )

    # Lock for production integrity
    bill.is_locked = True
    bill.generated_at = datetime.datetime.now(datetime.timezone.utc)
    db.add(bill)
    await db.commit()

    # Notify and Audit
    from app.services.audit_service import AuditService
    from app.repositories.user_repository import UserRepository

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)

    if user and user.email:
        from app.workers.tasks import send_email_task
        send_email_task.delay(
            to_email=user.email,
            subject=f"Your DairyDay Invoice for {month} is Ready",
            template="bill_ready",
            context={
                "user_name": user.name,
                "month": month,
                "amount": float(bill.total_amount),
                "due_date": "10th of next month",
            }
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
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Check if PDF is generated for a bill."""
    service = BillingService(db)
    bill = await service.get_bill_with_pdf(bill_id)

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    # Permission check: Admin or the bill owner
    admin_roles = ["ADMIN", "BILLING_ADMIN", "SUPERADMIN"]
    is_owner = current_user.id == bill.user_id
    if current_user.role not in admin_roles and not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized")

    if bill.pdf_url:
        return {
            "status": "completed",
            "pdf_url": bill.pdf_url,
        }

    return {
        "status": "queued",
        "message": "PDF generation in progress",
    }


@router.get("/{user_id}/{month}", response_model=BillModel)
async def get_bill_endpoint(
    user_id: UUID,
    month: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get a specific bill."""
    admin_roles = ["ADMIN", "BILLING_ADMIN", "SUPERADMIN"]
    if current_user.role not in admin_roles and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    repo = BillRepository(db)
    bill = await repo.get_by_user_and_month(user_id, month)
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    # Resolve signed PDF URL
    service = BillingService(db)
    bill = await service.get_bill_with_pdf(bill.id)
    return bill


@router.get("/", response_model=BillListResponse)
async def list_bills_endpoint(
    month: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """List bills with filtering and auth visibility."""
    admin_roles = ["ADMIN", "BILLING_ADMIN", "SUPERADMIN"]

    query = select(Bill, User.name.label("user_name")).join(
        User, Bill.user_id == User.id
    )

    if month:
        query = query.where(Bill.month == month)

    if current_user.role not in admin_roles:
        query = query.where(Bill.user_id == current_user.id)

    query = query.order_by(Bill.month.desc())

    result = await db.execute(query)
    rows = result.all()

    bills_data = []

    # Summary calculation variables
    paid_count = 0
    unpaid_count = 0
    overdue_count = 0
    paid_total = Decimal(0)
    unpaid_total = Decimal(0)
    overdue_total = Decimal(0)

    now = datetime.date.today()

    for bill_obj, user_name in rows:
        # Dynamic status logic for OVERDUE
        # If UNPAID and current date > 10th of following month
        if bill_obj.status == "UNPAID":
            try:
                b_year, b_month = map(int, bill_obj.month.split("-"))
                # Overdue if today > 10th of (month + 1)
                due_year = b_year + 1 if b_month == 12 else b_year
                due_month = 1 if b_month == 12 else b_month + 1
                due_date = datetime.date(due_year, due_month, 10)

                if now > due_date:
                    bill_obj.status = "OVERDUE"
            except Exception:
                pass

        if bill_obj.status == "PAID":
            paid_count += 1
            paid_total += bill_obj.total_amount
        elif bill_obj.status == "OVERDUE":
            overdue_count += 1
            overdue_total += bill_obj.total_amount
        else:
            unpaid_count += 1
            unpaid_total += bill_obj.total_amount

        # Resolve PDF URL in-place (no extra DB query)
        _resolve_pdf_url(bill_obj)
        bill_data = BillModel.model_validate(bill_obj)
        bill_data.user_name = str(user_name) if user_name else "User"
        bills_data.append(bill_data)

    summary = BillSummary(
        month=month if month else "ALL",
        total_bills=len(bills_data),
        paid_count=paid_count,
        unpaid_count=unpaid_count,
        paid_total=paid_total,
        unpaid_total=unpaid_total,
        overdue_total=overdue_total,
        overdue_count=overdue_count,
    )

    return {"bills": bills_data, "summary": summary}


@router.post("/bulk-action")
async def bulk_action_endpoint(
    request: BulkBillActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_billing_manager),
    idempotency_key: str = Depends(deps.require_idempotency_key),
) -> Any:
    """Perform bulk actions (Mark Paid, Remind) on multiple bills."""
    from app.services.audit_service import AuditService

    repo = BillRepository(db)
    updated_count = 0

    for bill_id in request.bill_ids:
        bill = await repo.get_by_id(bill_id)
        if not bill:
            continue

        if request.status == "PAID" and bill.status != "PAID":
            bill.status = "PAID"
            bill.updated_at = datetime.datetime.now(datetime.timezone.utc)
            db.add(bill)
            updated_count += 1

            await AuditService.log_action(
                db=db,
                user_id=current_user.id,
                action="BULK_MARK_PAID",
                target_type="BILL",
                target_id=str(bill.id),
                details={"notes": request.notes or "BULK_ADMIN_ACTION"}
            )

    await db.commit()

    return {
        "status": "success",
        "message": f"Successfully updated {updated_count} bills.",
        "updated": updated_count
    }


@router.post("/{bill_id}/submit-utr")
async def submit_utr_endpoint(
    bill_id: UUID,
    submission: BillUtrSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
    idempotency_key: str = Depends(deps.require_idempotency_key),
) -> Any:
    """Submit a UTR reference for a bill."""
    repo = BillRepository(db)
    bill = await repo.get_by_id(bill_id)

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    if bill.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to submit UTR for this bill"
        )

    if bill.status == "PAID":
        raise HTTPException(status_code=400, detail="Bill is already paid")

    bill.utr_reference = submission.utr_reference
    bill.utr_submitted_at = datetime.datetime.now(datetime.timezone.utc)

    db.add(bill)
    await db.commit()

    # Audit logic
    from app.services.audit_service import AuditService

    await AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="SUBMIT_UTR",
        target_type="BILL",
        target_id=str(bill.id),
        details={"utr": submission.utr_reference},
    )

    return {
        "status": "success",
        "message": "UTR reference submitted for verification",
        "utr_reference": bill.utr_reference,
    }
