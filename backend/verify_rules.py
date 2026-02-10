import asyncio
import datetime
from decimal import Decimal
from sqlalchemy import select, delete, text
from app.db.session import SessionLocal
from app.models.user import User
from app.models.bill import Bill
from app.models.consumption import Consumption
from app.services.billing_service import BillingService
from app.api.v1.endpoints.bills import generate_all_bills
from fastapi import BackgroundTasks

async def verify():
    print("Testing Bill Locking Rules...")
    async with SessionLocal() as db:
        # Cleanup
        await db.execute(text("DELETE FROM bills WHERE month = '2025-02'"))
        await db.execute(text("DELETE FROM consumption WHERE date >= '2025-02-01'"))
        await db.execute(text("DELETE FROM users WHERE email = 'test@example.com'"))
        await db.commit()

        # 1. Create User
        user = User(
            email="test@example.com", 
            hashed_password="x", 
            role="USER", 
            is_active=True,
            name="Test User",
            price_per_liter=60.0
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        uid = user.id
        print(f"Created User: {uid}")

        # 2. Add Consumption
        c1 = Consumption(user_id=uid, date=datetime.date(2025, 2, 1), quantity=10.0)
        db.add(c1)
        await db.commit()

        # 3. Generate Bill (via Service first to simulate Daily Entry)
        # This creates UNPAID, Unlocked bill
        bill = await BillingService.recalculate_bill(db, uid, "2025-02")
        print(f"Initial Bill: {bill.total_liters}L, Locked={bill.is_locked}")
        assert bill.total_liters == 10.0
        assert not bill.is_locked

        # 4. "Generate All" (Button Click)
        # This should lock it
        bg_tasks = BackgroundTasks()
        await generate_all_bills("2025-02", bg_tasks, db, None)
        
        await db.refresh(bill)
        print(f"After Generate: Locked={bill.is_locked}, GeneratedAt={bill.generated_at}")
        assert bill.is_locked
        assert bill.generated_at is not None

        # 5. Modify Consumption & Recalculate
        # Add more consumption
        c2 = Consumption(user_id=uid, date=datetime.date(2025, 2, 2), quantity=5.0)
        db.add(c2)
        await db.commit()

        # Try to recalc
        updated_bill = await BillingService.recalculate_bill(db, uid, "2025-02")
        print(f"After Recalc Attempt: {updated_bill.total_liters}L")
        
        # Should behave same (10.0) because it's locked
        assert updated_bill.total_liters == 10.0, f"Expected 10.0, got {updated_bill.total_liters}"
        
        print("✅ locking logic verified!")

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify())
