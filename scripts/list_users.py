import asyncio
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
from app.models.user import User

async def list_users():
    engine = create_async_engine("sqlite+aiosqlite:///./backend/dairy.db", future=True)
    async with AsyncSession(engine) as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        print(f"{'Name':<25} | {'Email':<25} | {'Role':<10} | {'Active':<10}")
        print("-" * 80)
        for u in users:
            print(f"{u.name:<25} | {u.email:<25} | {u.role:<10} | {u.is_active:<10}")

if __name__ == "__main__":
    asyncio.run(list_users())
