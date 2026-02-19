import asyncio
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
from app.models.bill import Bill
from app.models.user import User

async def check():
    engine = create_async_engine("sqlite+aiosqlite:///./backend/dairy.db", future=True)
    async with AsyncSession(engine) as session:
        try:
            result = await session.execute(select(Bill))
            bills = result.scalars().all()
            print(f"Total bills found: {len(bills)}")
            for b in bills:
                print(f"Bill ID: {b.id}, User ID: {b.user_id}, Month: {b.month}, Status: {b.status}, Locked: {b.is_locked}")
                
            res_users = await session.execute(select(User).where(User.email == 'user1@dairy.com'))
            u1 = res_users.scalars().first()
            if u1:
                print(f"User 1 ID: {u1.id}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check())
