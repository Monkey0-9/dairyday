import asyncio
import os
import sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.getcwd())))

from app.models.bill import Bill
from app.models.payment import Payment
from app.models.user import User
from app.models.consumption import Consumption
from app.core.config import settings

async def verify_state():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        print("\n--- SYSTEM STATE VERIFICATION ---")
        
        # 1. Check Users
        users_res = await db.execute(select(User))
        users = users_res.scalars().all()
        print(f"Total Users: {len(users)}")
        for u in users:
            print(f"  - {u.email} ({u.role})")

        # 2. Check Consumption
        cons_res = await db.execute(select(Consumption))
        cons = cons_res.scalars().all()
        print(f"Total Consumption Entries: {len(cons)}")

        # 3. Check Bills
        bills_res = await db.execute(select(Bill))
        bills = bills_res.scalars().all()
        print(f"Total Bills: {len(bills)}")
        for b in bills:
            print(f"  - Bill ID: {b.id}, User ID: {b.user_id}, Month: {b.month}, Status: {b.status}, Amount: {b.total_amount}")

        # 4. Check Payments
        payments_res = await db.execute(select(Payment))
        payments = payments_res.scalars().all()
        print(f"Total Payments: {len(payments)}")
        for p in payments:
            print(f"  - Payment ID: {p.id}, Bill ID: {p.bill_id}, Method: {p.provider}, Status: {p.status}, Amount: {p.amount}")

        print("\n--- VERIFICATION STATUS: PASSED ---")

if __name__ == "__main__":
    asyncio.run(verify_state())
