import asyncio
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
from app.models.bill import Bill
from app.models.user import User

async def check_and_reset():
    engine = create_async_engine("sqlite+aiosqlite:///./backend/dairy.db", future=True)
    async with AsyncSession(engine) as session:
        # 1. User 1
        res_users = await session.execute(select(User).where(User.email == 'user1@dairy.com'))
        u1 = res_users.scalars().first()
        if not u1:
            print("User 1 not found")
            return
        
        # 2. Feb 2026 Bill
        res_bill = await session.execute(
            select(Bill).where(Bill.user_id == u1.id, Bill.month == '2026-02')
        )
        bill = res_bill.scalars().first()
        
        if bill:
            print(f"BEFORE: Bill {bill.id}, Status: {bill.status}, Locked: {bill.is_locked}")
            bill.status = 'UNPAID'
            bill.is_locked = False
            bill.payment_id = None
            bill.paid_at = None
            await session.commit()
            
            # Re-fetch to verify
            await session.refresh(bill)
            print(f"AFTER: Bill {bill.id}, Status: {bill.status}, Locked: {bill.is_locked}")
        else:
            print("No Feb 2026 bill found for User 1.")

if __name__ == "__main__":
    asyncio.run(check_and_reset())
