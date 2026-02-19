import asyncio
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select, update
from app.models.bill import Bill
from app.models.user import User

async def reset_bill():
    engine = create_async_engine("sqlite+aiosqlite:///./backend/dairy.db", future=True)
    async with AsyncSession(engine) as session:
        try:
            # Find User 1
            res_users = await session.execute(select(User).where(User.email == 'user1@dairy.com'))
            u1 = res_users.scalars().first()
            if not u1:
                print("User 1 not found")
                return

            # Find Feb 2026 bill for User 1
            res_bill = await session.execute(
                select(Bill).where(Bill.user_id == u1.id, Bill.month == '2026-02')
            )
            bill = res_bill.scalars().first()
            
            if bill:
                print(f"Found bill {bill.id} in status {bill.status}. Resetting to UNPAID.")
                bill.status = 'UNPAID'
                bill.is_locked = False
                # Clear payment details if any
                bill.payment_id = None
                bill.paid_at = None
                await session.commit()
                print("Bill reset successfully.")
            else:
                print("No Feb 2026 bill found for User 1.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(reset_bill())
