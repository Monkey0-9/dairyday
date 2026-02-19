import asyncio
import sys
import os

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.core import security
from app.models.user import User
from sqlalchemy import select

async def verify_admin_login():
    async with SessionLocal() as db:
        # Fetch admin user
        result = await db.execute(select(User).where(User.email == "admin@dairy.com"))
        user = result.scalars().first()

        if not user:
            print("❌ Admin user 'admin@dairy.com' NOT FOUND")
            return

        print(f"✅ Found user: {user.email}")
        
        # Test password 'admin123'
        password_to_test = "admin123"
        is_valid = security.verify_password(password_to_test, user.hashed_password)

        if is_valid:
            print(f"✅ Password '{password_to_test}' is VALID for {user.email}")
        else:
            print(f"❌ Password '{password_to_test}' is INVALID for {user.email}")
            
            # Optional: Reset it if invalid (commented out for now, just verification)
            # print("Reseting password to 'admin123'...")
            # user.hashed_password = security.get_password_hash(password_to_test)
            # db.add(user)
            # await db.commit()
            # print("✅ Password reset to 'admin123'")

if __name__ == "__main__":
    asyncio.run(verify_admin_login())
