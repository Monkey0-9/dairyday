
import asyncio
import sys
from sqlalchemy import select

sys.path.insert(0, ".")

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

async def main():
    print("--- FIXING ALL INVALID PASSWORD HASHES ---")
    async with SessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        fixed_count = 0
        for user in users:
            is_bcrypt = user.hashed_password.startswith("$2b$") or user.hashed_password.startswith("$2a$")
            
            if not is_bcrypt:
                print(f"Fixing User: {user.email} (ID: {user.id})")
                
                # Determine new password based on role/email
                new_password = "user123"
                if "admin" in user.email.lower() or user.role == "ADMIN":
                    new_password = "admin123"
                
                new_hash = get_password_hash(new_password)
                user.hashed_password = new_hash
                db.add(user)
                fixed_count += 1
                print(f"  -> Reset password to '{new_password}'")

        if fixed_count > 0:
            await db.commit()
            print(f"\n✅ Successfully fixed {fixed_count} users.")
        else:
            print("\n✅ No invalid hashes found. All users are good.")

if __name__ == "__main__":
    asyncio.run(main())
