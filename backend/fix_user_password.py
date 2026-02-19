
import asyncio
import sys
from sqlalchemy import select, text

sys.path.insert(0, ".")

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

async def main():
    print("--- FIXING USER PASSWORD ---")
    async with SessionLocal() as db:
        # Fetch user1@dairy.com
        print("\nFetching user1@dairy.com...")
        result = await db.execute(select(User).where(User.email == "user1@dairy.com"))
        user = result.scalars().first()
        
        if user:
            print(f"  Found User ID: {user.id}")
            print(f"  Old Hash: {user.hashed_password}")
            
            # Update password to 'user123'
            new_hash = get_password_hash("user123")
            user.hashed_password = new_hash
            db.add(user)
            await db.commit()
            print(f"  ✅ Password updated to 'user123' (bcrypt hash: {new_hash})")
        else:
            print("  ❌ User not found!")

if __name__ == "__main__":
    asyncio.run(main())
