""" Consumption endpoints for DairyOS.

Elite Standard: Clean router architecture.
Delegates business logic to ConsumptionService and ConsumptionRepository.
"""

from typing import Annotated, Any, List
import datetime
import io
import csv
import openpyxl
import json
import logging
from uuid import UUID

from fastapi import (
    APIRouter, Depends, HTTPException, Query, UploadFile, File,
    Request as FastAPIRequest, BackgroundTasks
)
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.db.session import get_db
from app.core.redis import get_redis
from app.core.config import settings
from app.models.user import User
from app.models.consumption import Consumption
from app.schemas.consumption import (
    ConsumptionCreate,
    Consumption as ConsumptionSchema,
    MyConsumptionRequest
)
from app.services.consumption_service import ConsumptionService
from app.repositories.consumption_repository import ConsumptionRepository
from app.repositories.user_repository import UserRepository
from app.services.lock_service import LockService
from app.schemas.common import StatusResponse
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)
router = APIRouter()


async def recalculate_user_bill_task(user_id: UUID, month: str):
    """Background task to recalculate bill for a specific user."""
    from app.db.session import SessionLocal
    async with SessionLocal() as db:
        try:
            from app.services.billing_service import BillingService
            service = BillingService(db)
            await service.generate_bill_for_user(user_id, month, enqueue_pdf=False)
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to recalculate bill for {user_id}: {e}")


@router.get("/grid")
async def get_consumption_grid(
    month: Annotated[str, Query(pattern=r"^\d{4}-\d{2}$")],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_admin)],
) -> Any:
    """Fetch the consumption grid for a specific month (cached)."""
    redis = await get_redis()
    cache_key = f"grid:{month}"
    
    if redis:
        try:
            cached = await redis.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Cache retrieval failed: {e}")

    service = ConsumptionService(db)
    grid_data = await service.get_grid_data(month)

    if redis:
        try:
            await redis.set(cache_key, json.dumps(grid_data), ex=300)
        except Exception as e:
            logger.warning(f"Cache storage failed: {e}")
            
    return grid_data


@router.get("/mine", response_model=List[ConsumptionSchema])
async def get_my_consumption(
    month: Annotated[str, Query(pattern=r"^\d{4}-\d{2}$")],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
) -> Any:
    """Get consumption records for the current user."""
    from calendar import monthrange
    year, month_num = map(int, month.split("-"))
    start_date = datetime.date(year, month_num, 1)
    _, last_day = monthrange(year, month_num)
    end_date = datetime.date(year, month_num, last_day)

    repo = ConsumptionRepository(db)
    return await repo.get_for_user_in_range(
        current_user.id, start_date, end_date
    )


@router.patch("/mine")
async def update_my_consumption(
    db: Annotated[AsyncSession, Depends(get_db)],
    consumption_in: MyConsumptionRequest,
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """Allow users to request quantity changes for Today and Tomorrow."""
    today = datetime.date.today()
    tomorrow = today + datetime.timedelta(days=1)
    
    if consumption_in.date not in [today, tomorrow]:
        raise HTTPException(
            status_code=403,
            detail="Customers can strictly only modify Today and Tomorrow."
        )

    repo = ConsumptionRepository(db)
    existing = await repo.get_by_user_and_date(
        current_user.id, consumption_in.date
    )

    if existing:
        if existing.locked:
            raise HTTPException(status_code=403, detail="Entry is locked")
        
        existing.requested_quantity = consumption_in.quantity
        existing.requested_extra_qty = consumption_in.extra_qty
        existing.request_status = 'PENDING'
        existing.request_note = consumption_in.note
        db.add(existing)
    else:
        new_c = Consumption(
            user_id=current_user.id,
            date=consumption_in.date,
            quantity=current_user.daily_target_qty,
            requested_quantity=consumption_in.quantity,
            requested_extra_qty=consumption_in.extra_qty,
            request_status='PENDING',
            request_note=consumption_in.note,
            status='PENDING'
        )
        db.add(new_c)

    await db.commit()
    return {"status": "success", "message": "Request submitted."}


@router.patch("/")
async def upsert_consumption(
    *,
    request: FastAPIRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    consumption_in: ConsumptionCreate,
    current_user: Annotated[User, Depends(deps.get_current_active_admin)],
    background_tasks: BackgroundTasks,
) -> Any:
    """Admin upsert for consumption data."""
    service = ConsumptionService(db)
    try:
        await service.upsert_admin(
            user_id=consumption_in.user_id,
            date_val=consumption_in.date,
            quantity=float(consumption_in.quantity),
            extra_qty=float(consumption_in.extra_qty),
            status=consumption_in.status,
            note=consumption_in.note,
            admin_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Invalidate cache and trigger bill update
    month_str = consumption_in.date.strftime("%Y-%m")
    redis = await get_redis()
    if redis:
        await redis.delete(f"grid:{month_str}")
    
    background_tasks.add_task(
        recalculate_user_bill_task, consumption_in.user_id, month_str
    )

    return {"status": "success"}


@router.post("/upload")
async def upload_consumption(
    file: Annotated[UploadFile, File(...)],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_admin)],
) -> Any:
    """Process bulk consumption upload (CSV/XLSX)."""
    # Logic is complex, keeping it for now but using Repo and Service patterns
    # (Leaving direct implementation to avoid missing edge cases in refactor)
    contents = await file.read()
    filename = file.filename.lower()
    rows = []
    
    try:
        if filename.endswith(".csv"):
            decoded = contents.decode("utf-8")
            reader = csv.reader(io.StringIO(decoded))
            next(reader, None)
            rows = [r for r in reader if len(r) >= 3]
        elif filename.endswith(".xlsx"):
            workbook = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
            sheet = workbook.active
            rows = [r for r in sheet.iter_rows(min_row=2, values_only=True) if r and len(r) >= 3]
        else:
            raise HTTPException(status_code=400, detail="Use CSV or XLSX.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parse error: {str(e)}")

    if not rows:
        return {"processed_count": 0, "message": "No valid rows."}

    user_repo = UserRepository(db)
    all_users = await user_repo.get_active_users()
    users_map = {u.email.lower(): u for u in all_users if u.email}
    
    processed_count = 0
    errors = []
    affected_months = set()
    service = ConsumptionService(db)

    for idx, row in enumerate(rows):
        line = idx + 2
        try:
            email = str(row[0]).strip().lower()
            date_val = row[1]
            qty_val = row[2]

            user = users_map.get(email)
            if not user:
                errors.append(f"Row {line}: User {email} not found.")
                continue

            if isinstance(date_val, (datetime.date, datetime.datetime)):
                c_date = date_val.date() if isinstance(date_val, datetime.datetime) else date_val
            else:
                c_date = datetime.datetime.strptime(str(date_val).strip(), "%Y-%m-%d").date()

            await service.upsert_admin(
                user_id=user.id, date_val=c_date,
                quantity=float(qty_val), extra_qty=0,
                status="DELIVERED", note="Bulk Upload",
                admin_id=current_user.id
            )
            affected_months.add(c_date.strftime("%Y-%m"))
            processed_count += 1
        except Exception as e:
            errors.append(f"Row {line}: {str(e)}")

    redis = await get_redis()
    if redis:
        for m in affected_months:
            await redis.delete(f"grid:{m}")

    return {"processed_count": processed_count, "errors": errors[:50]}
