
import asyncio
import sys
from sqlalchemy import select

sys.path.insert(0, ".")

from app.db.session import SessionLocal
from app.models.user import User

async def main():
    print("--- CHECKING ALL PASSWORD HASHES ---")
    async with SessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        print(f"Found {len(users)} users.")
        
        bad_hash_count = 0
        for user in users:
            is_bcrypt = user.hashed_password.startswith("$2b$") or user.hashed_password.startswith("$2a$")
            if not is_bcrypt:
                print(f"BAD HASH: {user.email} (ID: {user.id})")
                print(f"   Hash: {user.hashed_password[:20]}...")
                bad_hash_count += 1
            else:
                 # print(f"OK: {user.email}")
                 pass
        
        print(f"\nTotal users with bad hashes: {bad_hash_count}")

if __name__ == "__main__":
    asyncio.run(main())
