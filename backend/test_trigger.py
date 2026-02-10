
import asyncio
import sys
import os
from uuid import UUID
from decimal import Decimal
from datetime import date

sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.consumption import Consumption
from app.models.bill import Bill
from app.services.billing_service import BillingService
from sqlalchemy import select, and_

async def test_trigger():
    session = SessionLocal()
    async with session as db:
        user_id = UUID('6bdfc82c-f674-4f55-9b2d-4373f273347d') # Customer 1
        month_str = "2026-02"
        
        # 1. Check current bill
        bill_result = await db.execute(
            select(Bill).where(and_(Bill.user_id == user_id, Bill.month == month_str))
        )
        bill = bill_result.scalars().first()
        print(f"Current Bill for Customer 1: liters={bill.total_liters}, amount={bill.total_amount}")
        
        # 2. Add a new consumption entry (Simulating what admin.py does)
        new_entry = Consumption(
            user_id=user_id,
            date=date(2026, 2, 10),
            quantity=Decimal("5.000")
        )
        db.add(new_entry)
        await db.commit()
        print("Added 5.0L entry for 2026-02-10")
        
        # 3. Manually call the trigger (Simulating the call in admin.py)
        await BillingService.recalculate_bill(db, user_id, month_str)
        await db.commit()
        
        # 4. Check bill again
        await db.refresh(bill)
        print(f"Updated Bill for Customer 1: liters={bill.total_liters}, amount={bill.total_amount}")
        
        # Verify
        if bill.total_liters == Decimal("23.700"): # 18.7 + 5.0
            print("SUCCESS: Bill updated automatically!")
        else:
            print(f"FAILURE: Bill liters is {bill.total_liters}, expected 23.700")

if __name__ == "__main__":
    asyncio.run(test_trigger())
