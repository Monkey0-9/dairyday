
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import joinedload
import datetime
from calendar import monthrange
from uuid import UUID
import csv
import io
import openpyxl

from app.api import deps
from app.db.session import get_db
from app.core.redis import get_redis
from app.core.config import settings
from app.models.consumption import Consumption
from app.models.user import User
from app.schemas.consumption import ConsumptionCreate, Consumption as ConsumptionSchema
from app.models.consumption_audit import ConsumptionAudit

from app.services.lock_service import LockService
from app.schemas.common import StatusResponse
from app.services.audit_service import AuditService
from fastapi import Request as FastAPIRequest

router = APIRouter()

@router.get("/grid")
async def get_consumption_grid(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    redis = get_redis()
    cache_key = f"grid:{month}"
    if redis:
        try:
            cached = await redis.get(cache_key)
            if cached:
                import json
                return json.loads(cached)
        except Exception:
            pass
    year, month_num = map(int, month.split("-"))
    start_date = datetime.date(year, month_num, 1)
    
    if month_num == 12:
        end_date = datetime.date(year + 1, 1, 1)
    else:
        end_date = datetime.date(year, month_num + 1, 1)

    # Get all active users
    users_result = await db.execute(
        select(User).where(User.role == "USER", User.is_active)
    )
    users = users_result.scalars().all()

    # Get consumption for the month
    consumption_result = await db.execute(
        select(Consumption).where(
            and_(
                Consumption.date >= start_date,
                Consumption.date < end_date
            )
        )
    )
    consumptions = consumption_result.scalars().all()

    # Get audits for the month
    audit_result = await db.execute(
        select(ConsumptionAudit)
        .options(joinedload(ConsumptionAudit.admin))
        .where(
            and_(
                ConsumptionAudit.date >= start_date,
                ConsumptionAudit.date <= end_date
            )
        )
        .order_by(ConsumptionAudit.created_at.desc())
    )
    audits = audit_result.scalars().all()

    # Map audits by user_id and date
    audit_map = {}
    for a in audits:
        if a.user_id not in audit_map:
            audit_map[a.user_id] = {}
        if a.date not in audit_map[a.user_id]:
            audit_map[a.user_id][a.date] = {
                "modified_by": a.admin.name if a.admin else "Unknown",
                "modified_at": a.created_at.isoformat(),
                "old_val": float(a.old_quantity) if a.old_quantity is not None else 0,
                "new_val": float(a.new_quantity)
            }

    # Map consumption by user_id and date
    consumption_map = {}
    for c in consumptions:
        if c.user_id not in consumption_map:
            consumption_map[c.user_id] = {}
        consumption_map[c.user_id][c.date] = c.quantity

    # Build grid
    grid_data = []
    for user in users:
        row = {
            "user_id": str(user.id),
            "name": user.name,
            "phone": user.phone,
            "daily_liters": {},
            "audits": {}
        }
        _, last_day = monthrange(year, month_num)
        for d in range(1, last_day + 1):
            current_date = datetime.date(year, month_num, d)
            qty = consumption_map.get(user.id, {}).get(current_date, 0)
            # Use YYYY-MM-DD string keys for daily_liters as frontend expects
            row["daily_liters"][current_date.isoformat()] = float(qty)

            if user.id in audit_map and current_date in audit_map[user.id]:
                row["audits"][d] = audit_map[user.id][current_date]

        grid_data.append(row)

    # Cache result
    if redis:
        try:
            import json
            await redis.set(cache_key, json.dumps(grid_data), ex=300)
        except Exception as e:
            print(f"Cache error: {e}")
    return grid_data

@router.get("/mine", response_model=List[ConsumptionSchema])
async def get_my_consumption(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    year, month_num = map(int, month.split("-"))
    start_date = datetime.date(year, month_num, 1)
    _, last_day = monthrange(year, month_num)
    end_date = datetime.date(year, month_num, last_day)

    result = await db.execute(
        select(Consumption).where(
            and_(
                Consumption.user_id == current_user.id,
                Consumption.date >= start_date,
                Consumption.date <= end_date
            )
        ).order_by(Consumption.date)
    )
    return result.scalars().all()


# Injection for IP/Agent
@router.patch("/")
async def upsert_consumption(
    *,
    request: FastAPIRequest,
    db: AsyncSession = Depends(get_db),
    consumption_in: ConsumptionCreate,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    # Check lock rule using settings
    if LockService.is_date_locked(consumption_in.date):
        raise HTTPException(
            status_code=403,
            detail=f"Cannot modify data older than {settings.LOCK_DAYS} days"
        )

    # Upsert logic
    result = await db.execute(
        select(Consumption).where(
            and_(
                Consumption.user_id == consumption_in.user_id,
                Consumption.date == consumption_in.date
            )
        )
    )
    existing = result.scalars().first()

    if existing:
        if existing.locked:
             raise HTTPException(status_code=400, detail="This entry has been explicitly locked")

        old_qty = float(existing.quantity)
        if old_qty == float(consumption_in.quantity):
            return {"status": "unchanged"}

        existing.quantity = consumption_in.quantity
        db.add(existing)

        # Record legacy audit
        db.add(ConsumptionAudit(
            user_id=existing.user_id,
            admin_id=current_user.id,
            date=existing.date,
            old_quantity=old_qty,
            new_quantity=consumption_in.quantity,
        ))

        # Record enterprise audit
        await AuditService.log_action(
            db=db,
            user_id=current_user.id,
            action="UPDATE_CONSUMPTION",
            target_type="CONSUMPTION",
            target_id=str(existing.id),
            details={
                "user_id": str(existing.user_id),
                "date": str(existing.date),
                "old_quantity": old_qty,
                "new_quantity": float(consumption_in.quantity)
            },
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
    else:
        new_consumption = Consumption(
            user_id=consumption_in.user_id,
            date=consumption_in.date,
            quantity=consumption_in.quantity
        )
        db.add(new_consumption)

        # Record legacy audit
        db.add(ConsumptionAudit(
            user_id=new_consumption.user_id,
            admin_id=current_user.id,
            date=new_consumption.date,
            old_quantity=None,
            new_quantity=new_consumption.quantity,
        ))

        # Record enterprise audit
        await AuditService.log_action(
            db=db,
            user_id=current_user.id,
            action="CREATE_CONSUMPTION",
            target_type="CONSUMPTION",
            target_id=None, # Will be set after flush if needed, but we provide user/date
            details={
                "user_id": str(new_consumption.user_id),
                "date": str(new_consumption.date),
                "quantity": float(new_consumption.quantity)
            },
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )

    await db.commit()
    # Invalidate cache for the month
    try:
        redis = get_redis()
        month_str = consumption_in.date.strftime("%Y-%m-%d")[:7]
        await redis.delete(f"grid:{month_str}")
    except Exception:
        pass

    return {"status": "success"}

@router.post("/upload")
async def upload_consumption(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    contents = await file.read()
    filename = file.filename.lower()

    rows = []
    try:
        if filename.endswith(".csv"):
            decoded = contents.decode("utf-8")
            reader = csv.reader(io.StringIO(decoded))
            next(reader, None) # Skip header
            rows = [r for r in reader if len(r) >= 3]
        elif filename.endswith(".xlsx"):
            workbook = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
            sheet = workbook.active
            rows = [row for row in sheet.iter_rows(min_row=2, values_only=True) if row and len(row) >= 3]
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV or XLSX.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    if not rows:
        return {"processed_count": 0, "message": "No valid rows found"}

    processed_count = 0
    errors = []
    lock_date = LockService.get_lock_date()

    # Pre-fetch users to avoid N+1
    users_result = await db.execute(select(User).where(User.role == "USER"))
    users_map = {u.email.lower(): u for u in users_result.scalars().all() if u.email}

    # Track months to invalidate cache
    affected_months = set()

    for idx, row in enumerate(rows):
        line_num = idx + 2
        try:
            email = str(row[0]).strip().lower()
            date_val = row[1]
            quantity_val = row[2]

            # 1. Validate User
            user = users_map.get(email)
            if not user:
                errors.append(f"Row {line_num}: User with email '{email}' not found.")
                continue

            # 2. Parse Date
            if isinstance(date_val, (datetime.date, datetime.datetime)):
                consumption_date = date_val.date() if isinstance(date_val, datetime.datetime) else date_val
            else:
                try:
                    consumption_date = datetime.datetime.strptime(str(date_val).strip(), "%Y-%m-%d").date()
                except ValueError:
                    errors.append(f"Row {line_num}: Invalid date format '{date_val}'. Use YYYY-MM-DD.")
                    continue

            # 3. Check Lock Rule
            if consumption_date < lock_date:
                errors.append(f"Row {line_num}: Date {consumption_date} is locked (before {lock_date}).")
                continue

            # 4. Parse Quantity
            try:
                quantity = float(quantity_val)
                if quantity < 0:
                    raise ValueError()
            except ValueError:
                errors.append(
                    f"Row {line_num}: Invalid quantity '{quantity_val}'. "
                    "Must be a positive number."
                )
                continue

            # 5. Upsert
            existing_res = await db.execute(
                select(Consumption).where(
                    and_(Consumption.user_id == user.id, Consumption.date == consumption_date)
                )
            )
            existing = existing_res.scalars().first()

            if existing:
                if not existing.locked:
                    old_qty = existing.quantity
                    existing.quantity = quantity
                    db.add(existing)
                    db.add(ConsumptionAudit(
                        user_id=user.id, admin_id=current_user.id, date=consumption_date,
                        old_quantity=old_qty, new_quantity=quantity
                    ))
            else:
                db.add(Consumption(user_id=user.id, date=consumption_date, quantity=quantity))
                db.add(ConsumptionAudit(
                    user_id=user.id, admin_id=current_user.id, date=consumption_date,
                    old_quantity=None, new_quantity=quantity
                ))

            affected_months.add(consumption_date.strftime("%Y-%m"))
            processed_count += 1

        except Exception as e:
            errors.append(f"Row {line_num}: Unexpected error: {str(e)}")

    await db.commit()

    # Invalidate Cache
    try:
        redis = get_redis()
        for m in affected_months:
            await redis.delete(f"grid:{m}")
    except Exception:
        pass

    return {
        "processed_count": processed_count,
        "error_count": len(errors),
        "errors": errors[:50] # Limit error output
    }

@router.get("/export")
async def export_consumption(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    year, month_num = map(int, month.split("-"))
    start_date = datetime.date(year, month_num, 1)
    _, last_day = monthrange(year, month_num)
    end_date = datetime.date(year, month_num, last_day)

    users_result = await db.execute(
        select(User).where(User.role == "USER", User.is_active)
    )
    users = users_result.scalars().all()

    consumption_result = await db.execute(
        select(Consumption).where(
            and_(
                Consumption.date >= start_date,
                Consumption.date <= end_date
            )
        )
    )
    consumptions = consumption_result.scalars().all()

    consumption_map = {}
    for c in consumptions:
        if c.user_id not in consumption_map:
            consumption_map[c.user_id] = {}
        consumption_map[c.user_id][c.date] = c.quantity

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    header = ["User Name", "Email"] + [str(d) for d in range(1, last_day + 1)] + ["Total"]
    writer.writerow(header)

    for user in users:
        row = [user.name, user.email]
        total = 0.0
        for d in range(1, last_day + 1):
            current_date = datetime.date(year, month_num, d)
            qty = consumption_map.get(user.id, {}).get(current_date, 0.0)
            row.append(qty)
            total += qty
        row.append(total)
        writer.writerow(row)

    output.seek(0)

    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=consumption_{month}.csv"
    return response


@router.post("/lock", response_model=StatusResponse)
async def lock_consumption_period(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    user_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Explicitly lock consumption for a month (globally or for a specific user)."""
    year, month_num = map(int, month.split("-"))
    start_date = datetime.date(year, month_num, 1)
    _, last_day = monthrange(year, month_num)
    end_date = datetime.date(year, month_num, last_day)

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
    return {"status": "success", "message": f"Locked {len(consumptions)} records for {month}"}
