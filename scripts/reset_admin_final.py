import asyncio
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select, update
from app.models.user import User
from app.core.security import get_password_hash

async def reset_admin():
    # Use the database that the backend is actually using
    db_path = "backend/dairy.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", future=True)
    async with AsyncSession(engine) as session:
        result = await session.execute(select(User).where(User.email == "admin@dairy.com"))
        user = result.scalars().first()
        
        if not user:
            print("ADMIN NOT FOUND - creating new one")
            user = User(
                name="Admin User",
                email="admin@dairy.com",
                hashed_password=get_password_hash("admin123"),
                role="ADMIN",
                is_active=True
            )
            session.add(user)
        else:
            print(f"Reseting password for {user.email}")
            user.hashed_password = get_password_hash("admin123")
            session.add(user)
            
        await session.commit()
        print("Admin password reset to 'admin123' successfully.")

if __name__ == "__main__":
    asyncio.run(reset_admin())
