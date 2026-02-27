"""
Consumption Service for DairyDay.
Elite Standard: Centralized business logic for consumption tracking.
"""

import logging
import datetime
from typing import List, Optional, Tuple
from uuid import UUID
from calendar import monthrange

from sqlalchemy import select, and_
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.consumption import Consumption
from app.models.consumption_audit import ConsumptionAudit
from app.repositories.consumption_repository import ConsumptionRepository
from app.repositories.user_repository import UserRepository
from app.services.lock_service import LockService

logger = logging.getLogger(__name__)


class ConsumptionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.consumption_repo = ConsumptionRepository(db)
        self.user_repo = UserRepository(db)

    async def get_grid_data(self, month: str) -> List[dict]:
        """Fetch and format consumption grid for a specific month."""
        year, month_num = map(int, month.split("-"))
        start_date = datetime.date(year, month_num, 1)
        _, last_day = monthrange(year, month_num)
        end_date = start_date + datetime.timedelta(days=last_day)

        # 1. Fetch Users
        users = await self.user_repo.get_active_users()

        # 2. Fetch Consumption & Audits in parallel (simulated or serial for now)
        cons_result = await self.db.execute(
            select(Consumption).where(
                and_(
                    Consumption.date >= start_date,
                    Consumption.date < end_date
                )
            )
        )
        consumptions = cons_result.scalars().all()

        audit_result = await self.db.execute(
            select(ConsumptionAudit)
            .options(joinedload(ConsumptionAudit.admin))
            .where(
                and_(
                    ConsumptionAudit.date >= start_date,
                    ConsumptionAudit.date < end_date,
                )
            )
            .order_by(ConsumptionAudit.created_at.desc())
        )
        audits = audit_result.scalars().all()

        # 3. Build lookup maps
        audit_map = {}
        for a in audits:
            if a.user_id not in audit_map:
                audit_map[a.user_id] = {}
            if a.date not in audit_map[a.user_id]:
                audit_map[a.user_id][a.date] = {
                    "modified_by": a.admin.name if a.admin else "Admin",
                    "modified_at": a.created_at.isoformat(),
                    "old_val": (
                        float(a.old_quantity) if a.old_quantity is not None else 0
                    ),
                    "new_val": float(a.new_quantity),
                }

        cons_map = {}
        request_map = {}
        for c in consumptions:
            if c.user_id not in cons_map:
                cons_map[c.user_id] = {}
            cons_map[c.user_id][c.date] = float(c.quantity)
            if c.request_status == "PENDING":
                if c.user_id not in request_map:
                    request_map[c.user_id] = {}
                request_map[c.user_id][c.date] = {
                    "requested_quantity": float(c.requested_quantity or 0),
                    "requested_extra_qty": float(c.requested_extra_qty or 0),
                    "request_note": c.request_note,
                }

        # 4. Assemble Grid
        grid = []
        for user in users:
            row = {
                "user_id": str(user.id),
                "name": user.name,
                "phone": user.phone,
                "daily_liters": {},
                "requests": {},
                "audits": {},
            }
            if hasattr(user, "email"):
                row["email"] = user.email

            for d in range(1, last_day + 1):
                curr_date = datetime.date(year, month_num, d)
                date_str = curr_date.isoformat()
                row["daily_liters"][date_str] = cons_map.get(user.id, {}).get(
                    curr_date, 0.0
                )

                if user.id in request_map and curr_date in request_map[user.id]:
                    row["requests"][date_str] = request_map[user.id][curr_date]

                if user.id in audit_map and curr_date in audit_map[user.id]:
                    row["audits"][d] = audit_map[user.id][curr_date]

            grid.append(row)

        return grid

    async def upsert_admin(
        self,
        user_id: UUID,
        date_val: datetime.date,
        quantity: float,
        extra_qty: float,
        status: str,
        note: Optional[str],
        admin_id: UUID,
    ):
        """Admin upsert with audit logging."""
        if LockService.is_date_locked(date_val):
            raise ValueError("Date is locked")

        existing = await self.consumption_repo.get_by_user_and_date(user_id, date_val)

        if existing:
            if existing.locked:
                raise ValueError("Entry is explicitly locked")

            old_qty = float(existing.quantity)
            existing.quantity = quantity
            existing.extra_qty = extra_qty
            existing.status = status
            existing.note = note

            # Create Audit
            audit = ConsumptionAudit(
                user_id=user_id,
                admin_id=admin_id,
                date=date_val,
                old_quantity=old_qty,
                new_quantity=quantity,
            )
            self.db.add(audit)
        else:
            new_c = Consumption(
                user_id=user_id,
                date=date_val,
                quantity=quantity,
                extra_qty=extra_qty,
                status=status,
                note=note,
            )
            self.db.add(new_c)
            audit = ConsumptionAudit(
                user_id=user_id,
                admin_id=admin_id,
                date=date_val,
                old_quantity=None,
                new_quantity=quantity,
            )
            self.db.add(audit)

        await self.db.commit()
        return True
