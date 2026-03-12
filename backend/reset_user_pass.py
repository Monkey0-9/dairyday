import asyncio
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy import select

async def main():
    email = "prakashpraveen239@gmail.com"
    pwd = "admin123"
    
    async with SessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        if user:
            print(f"Updating password for {email}")
            user.hashed_password = get_password_hash(pwd)
            session.add(user)
            await session.commit()
            print("Password updated.")
        else:
            print(f"User {email} not found.")

if __name__ == "__main__":
    asyncio.run(main())
