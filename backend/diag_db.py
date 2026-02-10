
import asyncio
import sys
import os

# Add parent directory to sys.path to find 'app'
sys.path.append(os.getcwd())

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
        users_result = await db.execute(select(User).limit(10))
        users = users_result.scalars().all()
        print(f"Users found: {len(users)}")
        for i, u in enumerate(users):
            print(f"[{i}] User: {u.id} - {u.name} - Role: {u.role}")

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
            print(f"User ID: {user_id} - Total Liters: {total}")

        # Check latest 5 consumption entries
        latest_cons = await db.execute(
            select(Consumption).order_by(Consumption.date.desc()).limit(5)
        )
        print(f"\nLatest 5 consumption entries:")
        for c in latest_cons.scalars().all():
            print(f"Date: {c.date} - User ID: {c.user_id} - Qty: {c.quantity}")

        # Check bills for Feb 2026
        bills_result = await db.execute(select(Bill).where(Bill.month == "2026-02"))
        bills = bills_result.scalars().all()
        print(f"\nBills for Feb 2026 (Found {len(bills)}):")
        for b in bills:
            print(f"Bill ID: {b.id} - User ID: {b.user_id} - Total Liters: {b.total_liters} - Amount: {b.total_amount}")

if __name__ == "__main__":
    asyncio.run(check())
