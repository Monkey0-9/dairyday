"""Check admin user in database and reset password if needed."""
import asyncio
import sys
sys.path.insert(0, ".")

async def main():
    from app.db.session import SessionLocal
    from app.models.user import User
    from sqlalchemy import select
    
    async with SessionLocal() as db:
        # Find all admin users
        result = await db.execute(select(User).where(User.role == "ADMIN"))
        admins = result.scalars().all()
        
        if not admins:
            print("NO ADMIN USERS FOUND!")
            # Check all users
            result2 = await db.execute(select(User))
            all_users = result2.scalars().all()
            print(f"Total users in DB: {len(all_users)}")
            for u in all_users:
                print(f"  - {u.name} | {u.email} | role={u.role} | active={u.is_active}")
        else:
            for admin in admins:
                print(f"Admin: {admin.name} | {admin.email} | active={admin.is_active}")
                print(f"  password_hash exists: {bool(admin.hashed_password)}")
                print(f"  hash preview: {admin.hashed_password[:30]}..." if admin.hashed_password else "  NO HASH")
                
                # Test the password
                from app.core.security import verify_password
                pwd_ok = verify_password("admin123", admin.hashed_password)
                print(f"  password 'admin123' matches: {pwd_ok}")
                
                if not pwd_ok:
                    # Reset password
                    from app.core.security import get_password_hash
                    admin.hashed_password = get_password_hash("admin123")
                    db.add(admin)
                    await db.commit()
                    print(f"  PASSWORD RESET to 'admin123'")

asyncio.run(main())
