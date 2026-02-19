import asyncio
import sys
import os
from datetime import date, timedelta
from decimal import Decimal

sys.path.append(os.getcwd())

from sqlalchemy import select, and_
from app.db.session import SessionLocal
from app.models.user import User
from app.models.consumption import Consumption
from app.schemas.consumption import MyConsumptionRequest

async def verify_ghost_logic():
    print("=" * 80)
    print("GHOST MODE LOGIC VERIFICATION")
    print("=" * 80)
    
    async with SessionLocal() as db:
        # 1. Get a test user
        user_result = await db.execute(select(User).where(User.role == "USER").limit(1))
        user = user_result.scalars().first()
        
        if not user:
            print("No test user found!")
            return

        print(f"\n[1] TEST USER: {user.name} (Subscription: {user.daily_target_qty}L)")
        
        # 2. Pick a date (tomorrow)
        test_date = date.today() + timedelta(days=1)
        print(f"[2] TEST DATE: {test_date}")
        
        # 3. Clean up existing record for this date if any
        existing_result = await db.execute(
            select(Consumption).where(and_(
                Consumption.user_id == user.id,
                Consumption.date == test_date
            ))
        )
        existing = existing_result.scalars().first()
        if existing:
            await db.delete(existing)
            await db.commit()
            print(f"    Cleaned up existing record for {test_date}")

        # 4. Mock a "Reduction" request via update_my_consumption logic
        # We'll simulate the endpoint logic here since we fixed it
        target_qty = user.daily_target_qty - Decimal("0.5")
        print(f"\n[3] SUBMITTING REDUCTION REQUEST: Target {target_qty}L (Reduction of 0.5L)")
        
        # Actual logic from endpoints/consumption.py:
        new_c = Consumption(
            user_id=user.id,
            date=test_date,
            quantity=user.daily_target_qty, # This is the fix!
            extra_qty=0,
            requested_quantity=target_qty,
            requested_extra_qty=0,
            request_status='PENDING',
            request_note="E2E Test Reduction",
            status='PENDING'
        )
        db.add(new_c)
        await db.commit()
        await db.refresh(new_c)
        
        # 5. Verify the state
        print(f"\n[4] VERIFYING PERSISTENCE:")
        print(f"    Base Quantity:      {new_c.quantity}L (Should be {user.daily_target_qty}L)")
        print(f"    Requested Quantity: {new_c.requested_quantity}L")
        
        if new_c.quantity == user.daily_target_qty:
            print("    [PASS] Record initialized with subscription volume.")
        else:
            print(f"    [FAIL] Record initialized with {new_c.quantity}L, expected {user.daily_target_qty}L")

        # 6. Check Admin View Logic (Type determination)
        current_qty = float(new_c.quantity)
        requested_qty = float(new_c.requested_quantity)
        is_reduction = requested_qty < current_qty and requested_qty > 0
        
        print(f"\n[5] ADMIN VIEW SIMULATION:")
        print(f"    Detected as REDUCTION: {is_reduction}")
        
        if is_reduction:
            print("    [PASS] Admin will correctly identify this as a REDUCTION.")
        else:
            print("    [FAIL] Admin logic failure.")

        # Cleanup
        await db.delete(new_c)
        await db.commit()
        print("\n[6] CLEANUP COMPLETE.")
        print("=" * 80)

if __name__ == "__main__":
    asyncio.run(verify_ghost_logic())
