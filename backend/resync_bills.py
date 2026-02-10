"""
Bill Resynchronization Script for DairyOS
This script:
1. Fetches all users
2. Recalculates bills for February 2026 based on actual consumption
3. Prints before/after comparison
"""
import asyncio
import sys
import os
from uuid import UUID
from decimal import Decimal
from datetime import date
from calendar import monthrange

sys.path.append(os.getcwd())

from sqlalchemy import select, func, and_
from app.db.session import SessionLocal
from app.models.user import User
from app.models.consumption import Consumption
from app.models.bill import Bill
from app.services.billing_service import BillingService


async def resync_all_bills():
    session = SessionLocal()
    async with session as db:
        month_str = "2026-02"
        
        print("=" * 80)
        print("DAIRYOS BILL RESYNCHRONIZATION")
        print("=" * 80)

        # 1. Fetch all USER-role users
        users_result = await db.execute(
            select(User).where(User.role == "USER")
        )
        users = users_result.scalars().all()
        print(f"\nFound {len(users)} customers. Recalculating bills for {month_str}...\n")

        success_count = 0
        for user in users:
            # Get current bill state
            bill_result = await db.execute(
                select(Bill).where(and_(Bill.user_id == user.id, Bill.month == month_str))
            )
            old_bill = bill_result.scalars().first()
            old_liters = old_bill.total_liters if old_bill else Decimal("0")
            old_amount = old_bill.total_amount if old_bill else Decimal("0")
            
            # Skip PAID bills as they are locked
            if old_bill and old_bill.status == "PAID":
                print(f"  SKIP: {user.name:20} (Bill is PAID - locked)")
                continue
            
            # Recalculate
            try:
                updated_bill = await BillingService.recalculate_bill(db, user.id, month_str)
                await db.commit()
                
                if updated_bill:
                    new_liters = updated_bill.total_liters
                    new_amount = updated_bill.total_amount
                    
                    if old_liters != new_liters:
                        print(f"  FIX:  {user.name:20} | {old_liters:8.3f}L -> {new_liters:8.3f}L | Rs.{old_amount:.2f} -> Rs.{new_amount:.2f}")
                    else:
                        print(f"  OK:   {user.name:20} | {new_liters:8.3f}L | Rs.{new_amount:.2f}")
                    success_count += 1
                else:
                    print(f"  WARN: {user.name:20} - No bill created (zero consumption?)")
            except Exception as e:
                print(f"  ERR:  {user.name:20} - {str(e)}")

        await db.commit()
        print(f"\n{'=' * 80}")
        print(f"RESYNC COMPLETE: {success_count}/{len(users)} bills processed.")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(resync_all_bills())
