import asyncio
import sys
from sqlalchemy import select
from app.db.session import async_session
from app.models.user import User

# Add current dir to path
import os
sys.path.append(os.getcwd())

async def main():
    print("Starting reproduction script...")
    async with async_session() as session:
        print("Session created. Executing select...")
        try:
            stmt = select(User).where(User.email == "admin@dairy.com")
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            print(f"User found: {user}")
            if user:
                print(f"Hashed password: {user.hashed_password}")
        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
