
from app.core.security import get_password_hash
from app.db.session import engine
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import asyncio

async def reset_admin():
    async with AsyncSession(engine) as session:
        result = await session.execute(
            select(User).where(User.email == "admin@dairy.com")
        )
        admin = result.scalars().first()
        
        if admin:
            print(f"Resetting password for {admin.email}")
            admin.hashed_password = get_password_hash("admin123")
            session.add(admin)
            await session.commit()
            print("Password reset successful.")
        else:
            print("Admin user not found.")

if __name__ == "__main__":
    asyncio.run(reset_admin())
