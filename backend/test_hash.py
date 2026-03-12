import asyncio
import sys

from app.db.session import engine, SessionLocal
from app.models.user import User
from app.core.security import verify_password
from sqlalchemy import select

async def main():
    async with SessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "admin@dairy.com"))
        user = result.scalars().first()
        if not user:
            print("❌ User not found")
            return
        
        print(f"User found: {user.email}")
        print(f"Is active: {user.is_active}")
        print(f"Role: {user.role}")
        
        pwd = "admin123"
        is_valid = verify_password(pwd, user.hashed_password)
        print(f"Password 'admin123' valid? {is_valid}")
        
        # Test the other user
        result2 = await session.execute(select(User).where(User.email == "prakashpraveen239@gmail.com"))
        user2 = result2.scalars().first()
        if user2:
            print(f"User 2 found: {user2.email}")
            is_valid2 = verify_password(pwd, user2.hashed_password)
            print(f"User 2 password 'admin123' valid? {is_valid2}")

if __name__ == "__main__":
    asyncio.run(main())
