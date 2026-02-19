
import asyncio
import sys
import os
from uuid import uuid4
from decimal import Decimal

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.core.security import get_password_hash

async def reset_passwords():
    # Relative path from project root
    db_path = "sqlite+aiosqlite:///./backend/dairy.db"
    print(f"🔄 Connecting to {db_path}...")
    engine = create_async_engine(db_path, future=True)
    
    async with AsyncSession(engine) as session:
        # Check admin
        res = await session.execute(select(User).where(User.email == "admin@dairy.com"))
        admin = res.scalars().first()
        if admin:
            print("👤 Found admin, resetting password to 'admin123'...")
            admin.hashed_password = get_password_hash("admin123")
            admin.is_active = True
            session.add(admin)
        else:
            print("❌ Admin not found!")

        # Check user1
        res = await session.execute(select(User).where(User.email == "user1@dairy.com"))
        user1 = res.scalars().first()
        if user1:
            print("👤 Found user1, resetting password to 'user123'...")
            user1.hashed_password = get_password_hash("user123")
            user1.is_active = True
            session.add(user1)
        else:
            print("❌ user1@dairy.com not found! Creating...")
            user1 = User(
                id=uuid4(),
                email="user1@dairy.com",
                hashed_password=get_password_hash("user123"),
                name="Customer 1",
                role="USER",
                price_per_liter=Decimal("50.00"),
                is_active=True
            )
            session.add(user1)

        await session.commit()
        print("✅ Passwords reset/updated successfully!")

if __name__ == "__main__":
    asyncio.run(reset_passwords())
