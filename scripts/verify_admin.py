import asyncio
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.core import security

async def verify_admin():
    engine = create_async_engine("sqlite+aiosqlite:///./backend/dairy.db", future=True)
    async with AsyncSession(engine) as session:
        result = await session.execute(select(User).where(User.email == "admin@dairy.com"))
        user = result.scalars().first()
        
        if not user:
            print("ADMIN NOT FOUND")
            return
            
        print(f"User Found: {user.email}")
        print(f"Hashed Password: {user.hashed_password}")
        
        test_pass = "admin123"
        is_valid = security.verify_password(test_pass, user.hashed_password)
        print(f"Verification for '{test_pass}': {is_valid}")

if __name__ == "__main__":
    asyncio.run(verify_admin())
