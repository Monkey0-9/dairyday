import asyncio
from app.db.session import async_session
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy import select
from decimal import Decimal

async def main():
    async with async_session() as db:
        email = "user1@dairy.com"
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if user:
            print(f"User {email} found. Role: {user.role}. Updating password to 'password123'...")
            user.hashed_password = get_password_hash("password123")
            db.add(user)
            await db.commit()
            print("Password updated.")
        else:
            print(f"User {email} NOT found. Creating...")
            user = User(
                name="Test Customer 1",
                email=email,
                hashed_password=get_password_hash("password123"),
                role="USER",
                is_active=True,
                price_per_liter=Decimal("62.0")
            )
            db.add(user)
            await db.commit()
            print("User created.")

if __name__ == "__main__":
    import os
    import sys
    sys.path.insert(0, os.getcwd())
    asyncio.run(main())
