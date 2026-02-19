
import asyncio
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.core.security import verify_password, get_password_hash

async def check():
    db_path = "sqlite+aiosqlite:///./backend/dairy.db"
    print(f"🔌 Connecting to {db_path}...")
    engine = create_async_engine(db_path, future=True)
    
    async with AsyncSession(engine) as session:
        res = await session.execute(select(User).where(User.email == "user1@dairy.com"))
        user = res.scalars().first()
        if not user:
            print("❌ User user1@dairy.com not found!")
            return

        print(f"👤 Found User: {user.email}")
        print(f"🔑 Hashed Password in DB: {user.hashed_password}")
        
        test_pass = "user123"
        is_valid = verify_password(test_pass, user.hashed_password)
        print(f"🧪 Verifying '{test_pass}': {'✅ MATCH' if is_valid else '❌ FAILED'}")
        
        # Also try to generate a new hash and verify it
        new_hash = get_password_hash(test_pass)
        print(f"🆕 New Hash for '{test_pass}': {new_hash}")
        is_new_valid = verify_password(test_pass, new_hash)
        print(f"🧪 Verifying New Hash: {'✅ MATCH' if is_new_valid else '❌ FAILED'}")

if __name__ == "__main__":
    asyncio.run(check())
