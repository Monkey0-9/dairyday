import asyncio
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

async def reset_password():
    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "user1@dairy.com"))
        user = result.scalars().first()
        if user:
            user.hashed_password = get_password_hash("password123")
            db.add(user)
            await db.commit()
            print("Password for user1@dairy.com reset to password123")
        else:
            print("User user1@dairy.com not found")

if __name__ == "__main__":
    asyncio.run(reset_password())
