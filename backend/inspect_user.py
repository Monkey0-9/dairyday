
import asyncio
import sys
from sqlalchemy import select

sys.path.insert(0, ".")

from app.db.session import SessionLocal
from app.models.user import User

async def main():
    print("--- INSPECTING USERS ---")
    async with SessionLocal() as db:
        # Check user1@dairy.com
        print("\nChecking user1@dairy.com:")
        result = await db.execute(select(User).where(User.email == "user1@dairy.com"))
        user_com = result.scalars().first()
        if user_com:
            print(f"  ID: {user_com.id}")
            print(f"  Email: {user_com.email}")
            print(f"  Hashed Password: '{user_com.hashed_password}'")
        else:
            print("  NOT FOUND")

        # Check user1@dairy.in
        print("\nChecking user1@dairy.in:")
        result = await db.execute(select(User).where(User.email == "user1@dairy.in"))
        user_in = result.scalars().first()
        if user_in:
            print(f"  ID: {user_in.id}")
            print(f"  Email: {user_in.email}")
            print(f"  Hashed Password: '{user_in.hashed_password}'")
        else:
            print("  NOT FOUND")

if __name__ == "__main__":
    asyncio.run(main())
