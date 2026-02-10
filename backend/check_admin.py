import asyncio
from app.db.session import async_session
from app.models.user import User
from sqlalchemy import select

async def main():
    async with async_session() as db:
        result = await db.execute(select(User).where(User.role == "ADMIN"))
        users = result.scalars().all()
        print("=== ADMIN USERS ===")
        for u in users:
            print(f"Email: {u.email}")
            print(f"Name: {u.name}")
            print(f"Active: {u.is_active}")
            print(f"Phone: {u.phone}")
            print("---")
        
        if not users:
            print("No admin users found!")

asyncio.run(main())
