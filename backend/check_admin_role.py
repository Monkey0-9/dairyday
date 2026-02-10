import asyncio
import sys
import os
from sqlalchemy import select

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.db.session import async_session
from app.models.user import User

async def main():
    async with async_session() as session:
        result = await session.execute(select(User).where(User.email == "admin@dairy.com"))
        user = result.scalars().first()
        
        if user:
            print(f"User Found: {user.email}")
            print(f"Role: '{user.role}'")
        else:
            print("User admin@dairy.com NOT FOUND")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
