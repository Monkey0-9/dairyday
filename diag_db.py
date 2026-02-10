
import asyncio
from sqlalchemy import select, func
from app.db.session import SessionLocal
from app.models.user import User
from app.models.consumption import Consumption
from app.models.bill import Bill
from uuid import UUID
from datetime import date

async def check():
    session = SessionLocal()
    async with session as db:
        # Check users
        users_result = await db.execute(select(User).limit(5))
        users = users_result.scalars().all()
        print(f"Users found: {len(users)}")
        for u in users:
            print(f"User: {u.id} - {u.name}")

        # Check consumption for Feb 2026
        start_of_month = date(2026, 2, 1)
        cons_result = await db.execute(
            select(Consumption.user_id, func.sum(Consumption.quantity))
            .where(Consumption.date >= start_of_month)
            .group_by(Consumption.user_id)
        )
        cons = cons_result.all()
        print(f"\nConsumption summaries for Feb 2026 (Found {len(cons)} users):")
        for user_id, total in cons:
            print(f"User ID: {user_id} - Total: {total}")

        # Check bills for Feb 2026
        bills_result = await db.execute(select(Bill).where(Bill.month == "2026-02"))
        bills = bills_result.scalars().all()
        print(f"\nBills for Feb 2026 (Found {len(bills)}):")
        for b in bills:
            print(f"Bill ID: {b.id} - User ID: {b.user_id} - Total: {b.total_liters} - Amount: {b.total_amount}")

if __name__ == "__main__":
    asyncio.run(check())
