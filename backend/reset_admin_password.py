import asyncio
from app.db.session import async_session
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy import select

async def main():
    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == "admin@dairy.com"))
        user = result.scalars().first()
        
        if user:
            # Reset password to admin123
            user.hashed_password = get_password_hash("admin123")
            db.add(user)
            await db.commit()
            print("Password reset to 'admin123' for admin@dairy.com")
        else:
            print("Admin user not found!")

asyncio.run(main())
