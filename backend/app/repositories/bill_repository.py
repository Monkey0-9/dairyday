"""
Bill Repository for DairyDay.
Elite Standard: Centralized database logic for Bills.
"""

from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.bill import Bill


class BillRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, bill_id: UUID) -> Optional[Bill]:
        """Fetch a bill by its ID."""
        result = await self.db.execute(select(Bill).where(Bill.id == bill_id))
        return result.scalars().first()

    async def get_by_user_and_month(self, user_id: UUID, month: str) -> Optional[Bill]:
        """Fetch a specific bill for a user and month."""
        result = await self.db.execute(
            select(Bill).where(and_(Bill.user_id == user_id, Bill.month == month))
        )
        return result.scalars().first()

    async def get_all_for_month(self, month: str) -> List[Bill]:
        """Fetch all bills for a specific month."""
        result = await self.db.execute(select(Bill).where(Bill.month == month))
        return result.scalars().all()

    async def get_pending_for_user(self, user_id: UUID) -> List[Bill]:
        """Fetch all UNPAID bills for a user."""
        result = await self.db.execute(
            select(Bill).where(and_(Bill.user_id == user_id, Bill.status == "UNPAID"))
        )
        return result.scalars().all()

    async def create(self, bill: Bill) -> Bill:
        """Persist a new bill."""
        self.db.add(bill)
        await self.db.flush()
        return bill

    async def update(self, bill: Bill) -> Bill:
        """Sync changes to an existing bill."""
        self.db.add(bill)
        await self.db.flush()
        return bill

    async def delete(self, bill: Bill) -> bool:
        """Remove a bill."""
        await self.db.delete(bill)
        await self.db.flush()
        return True
