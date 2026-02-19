
import asyncio
import sys
from sqlalchemy import select, func

sys.path.insert(0, ".")

async def verify():
    from app.db.session import SessionLocal, engine
    from app.models.user import User
    from app.models.bill import Bill
    from app.models.consumption import Consumption
    from app.models.payment import Payment

    async with SessionLocal() as db:
        print("--- Database Verification ---")
        
        # Count Users
        res = await db.execute(select(func.count()).select_from(User))
        user_count = res.scalar()
        print(f"Users: {user_count}")

        # Count Active Users
        res = await db.execute(select(func.count()).select_from(User).where(User.is_active == True))
        active_user_count = res.scalar()
        print(f"Active Users: {active_user_count}")

        # Count Consumption
        res = await db.execute(select(func.count()).select_from(Consumption))
        consump_count = res.scalar()
        print(f"Consumption Records: {consump_count}")

        # Count Bills
        res = await db.execute(select(func.count()).select_from(Bill))
        bill_count = res.scalar()
        print(f"Bills: {bill_count}")

        # Count Payments
        res = await db.execute(select(func.count()).select_from(Payment))
        payment_count = res.scalar()
        print(f"Payments: {payment_count}")

        # Check Admin
        res = await db.execute(select(User).where(User.role == "ADMIN"))
        admin = res.scalars().first()
        if admin:
            print(f"Admin Exists: {admin.email} (Active: {admin.is_active})")
        else:
            print("❌ NO ADMIN FOUND")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(verify())
