import asyncio
from app.db.session import SessionLocal
from app.models.user import User
from sqlalchemy import select, or_
from app.core import security

async def test_login():
    email = "admin@dairy.com"
    password = "admin123"
    
    print(f"Testing login for {email}...")
    
    async with SessionLocal() as db:
        result = await db.execute(
            select(User).where(
                or_(
                    User.email == email,
                    User.phone == email
                )
            )
        )
        user = result.scalars().first()
        
        if not user:
            print("FAILED: User not found in DB.")
            return

        print(f"User found: ID={user.id}, Role={user.role}, Active={user.is_active}")
        print(f"Stored Hash: {user.hashed_password}")
        
        is_valid = security.verify_password(password, user.hashed_password)
        print(f"Password verification result: {is_valid}")
        
        if not is_valid:
            print("FAILED: Password mismatch.")
            # Try to see if it works with raw bcrypt
            import bcrypt
            try:
                raw_valid = bcrypt.checkpw(password.encode('utf-8'), user.hashed_password.encode('utf-8'))
                print(f"Raw bcrypt verification result: {raw_valid}")
            except Exception as e:
                print(f"Raw bcrypt error: {e}")
        else:
            print("SUCCESS: Password verified.")

if __name__ == "__main__":
    asyncio.run(test_login())
