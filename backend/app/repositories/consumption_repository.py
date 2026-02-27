"""
Consumption Repository for DairyDay.
Elite Standard: Centralized database logic for Consumption data.
"""

from typing import Optional, List
from uuid import UUID
from datetime import date
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.consumption import Consumption


class ConsumptionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, consumption_id: UUID) -> Optional[Consumption]:
        """Fetch a consumption record by its ID."""
        result = await self.db.execute(
            select(Consumption).where(Consumption.id == consumption_id)
        )
        return result.scalars().first()

    async def get_by_user_and_date(
        self, user_id: UUID, consumption_date: date
    ) -> Optional[Consumption]:
        """Fetch a specific consumption record for a user and date."""
        result = await self.db.execute(
            select(Consumption).where(
                and_(
                    Consumption.user_id == user_id, Consumption.date == consumption_date
                )
            )
        )
        return result.scalars().first()

    async def get_for_user_in_range(
        self, user_id: UUID, start_date: date, end_date: date
    ) -> List[Consumption]:
        """Fetch all consumption records for a user within a date range."""
        result = await self.db.execute(
            select(Consumption)
            .where(
                and_(
                    Consumption.user_id == user_id,
                    Consumption.date >= start_date,
                    Consumption.date <= end_date,
                )
            )
            .order_by(Consumption.date)
        )
        return result.scalars().all()

    async def create(self, consumption: Consumption) -> Consumption:
        """Persist a new consumption record."""
        self.db.add(consumption)
        await self.db.flush()
        return consumption

    async def update(self, consumption: Consumption) -> Consumption:
        """Sync changes to an existing consumption record."""
        self.db.add(consumption)
        await self.db.flush()
        return consumption

    async def delete(self, consumption: Consumption) -> bool:
        """Remove a consumption record."""
        await self.db.delete(consumption)
        await self.db.flush()
        return True

    async def get_monthly_stats(
        self, user_id: UUID, start_date: date, end_date: date
    ) -> dict:
        """Get aggregated stats for a user for a specific month."""
        result = await self.db.execute(
            select(
                func.sum(Consumption.quantity).label("total_liters"),
                func.count(Consumption.id).label("entry_count"),
            ).where(
                and_(
                    Consumption.user_id == user_id,
                    Consumption.date >= start_date,
                    Consumption.date <= end_date,
                )
            )
        )
        row = result.first()
        return {
            "total_liters": row.total_liters or 0,
            "entry_count": row.entry_count or 0,
        }
