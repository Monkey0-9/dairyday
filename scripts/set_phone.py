import asyncio
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import update
from app.models.user import User

async def set_phone():
    engine = create_async_engine("sqlite+aiosqlite:///./backend/dairy.db", future=True)
    async with AsyncSession(engine) as session:
        await session.execute(
            update(User).where(User.email == 'user1@dairy.com').values(phone='9988776655')
        )
        await session.commit()
    print("Phone updated successfully for user1@dairy.com")

if __name__ == "__main__":
    asyncio.run(set_phone())
