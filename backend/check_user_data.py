import asyncio
from app.db.session import async_session
from app.models.user import User
from app.core.security import verify_password, get_password_hash
from sqlalchemy import select

async def main():
    email = "user1@dairy.com"
    password = "password123"

    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        print(f"=== CHECKING USER: {email} ===")
        if user:
            print(f"User Found: {user.name}")
            print(f"Role: {user.role}")
            print(f"Active: {user.is_active}")
            
            # Verify Password
            is_valid = verify_password(password, user.hashed_password)
            print(f"Password '{password}' Valid: {is_valid}")
            
            if not is_valid:
                print("Password incorrect. Resetting to 'password123'...")
                user.hashed_password = get_password_hash(password)
                db.add(user)
                await db.commit()
                print("Password reset successfully.")
        else:
            print("User NOT found. Creating...")
            new_user = User(
                email=email,
                hashed_password=get_password_hash(password),
                name="Demo User",
                role="customer",
                is_active=True,
                phone="9876543210"
            )
            db.add(new_user)
            await db.commit()
            print(f"Created user: {email} / {password}")

if __name__ == "__main__":
    asyncio.run(main())
