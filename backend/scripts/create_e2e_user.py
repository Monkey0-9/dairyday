import asyncio
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

async def create_e2e_user():
    async with SessionLocal() as db:
        # Check if already exists
        from sqlalchemy import select
        res = await db.execute(select(User).where(User.email == "e2e_test@dairy.com"))
        if res.scalars().first():
            print("E2E user already exists")
            return

        new_user = User(
            name="E2E Test User",
            email="e2e_test@dairy.com",
            phone="9999999999",
            role="USER",
            is_active=True,
            hashed_password=get_password_hash("password123")
        )
        db.add(new_user)
        await db.commit()
        print("E2E user created: e2e_test@dairy.com / password123")

if __name__ == "__main__":
    asyncio.run(create_e2e_user())
