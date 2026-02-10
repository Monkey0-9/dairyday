"""
End-to-End Test for DairyOS Data Consistency
Tests:
1. Fetch current state of a customer
2. Add a new daily entry (using future date to avoid conflict)
3. Verify bill was updated automatically
4. Verify customer consumption reflects new entry
"""
import asyncio
import sys
import os
from uuid import UUID
from decimal import Decimal
from datetime import date

sys.path.append(os.getcwd())

from sqlalchemy import select, func, and_
from app.db.session import SessionLocal
from app.models.user import User
from app.models.consumption import Consumption
from app.models.bill import Bill
from app.services.billing_service import BillingService


async def e2e_test():
    session = SessionLocal()
    async with session as db:
        print("=" * 80)
        print("END-TO-END TEST: Daily Entry -> Bill -> Customer Sync")
        print("=" * 80)
        
        # Use Customer 2 for testing
        user_id = UUID('40bfd029-905e-48f4-b48b-52088547af59')
        month_str = "2026-02"
        # Use a unique future date to avoid UNIQUE constraint violation
        test_date = date(2026, 2, 28)  # Feb 28
        test_qty = Decimal("2.500")
        
        # Fetch user
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalars().first()
        print(f"\n[1] TARGET USER: {user.name} (Rate: Rs.{user.price_per_liter}/L)")
        
        # Check if entry already exists for this date
        existing_entry = await db.execute(
            select(Consumption).where(and_(
                Consumption.user_id == user_id,
                Consumption.date == test_date
            ))
        )
        if existing_entry.scalars().first():
            print(f"\n    Entry for {test_date} already exists. Using Feb 27 instead.")
            test_date = date(2026, 2, 27)
            existing_entry2 = await db.execute(
                select(Consumption).where(and_(
                    Consumption.user_id == user_id,
                    Consumption.date == test_date
                ))
            )
            if existing_entry2.scalars().first():
                print(f"    Entry for {test_date} also exists. Using Feb 26.")
                test_date = date(2026, 2, 26)
        
        # Get current consumption total
        start_of_month = date(2026, 2, 1)
        cons_result = await db.execute(
            select(func.sum(Consumption.quantity))
            .where(and_(
                Consumption.user_id == user_id,
                Consumption.date >= start_of_month
            ))
        )
        old_consumption = cons_result.scalar() or Decimal("0")
        
        # Get current bill
        bill_result = await db.execute(
            select(Bill).where(and_(Bill.user_id == user_id, Bill.month == month_str))
        )
        bill = bill_result.scalars().first()
        old_bill_liters = bill.total_liters if bill else Decimal("0")
        old_bill_amount = bill.total_amount if bill else Decimal("0")
        
        print(f"\n[2] CURRENT STATE:")
        print(f"    Consumption Total: {old_consumption:.3f} L")
        print(f"    Bill Total:        {old_bill_liters:.3f} L (Rs.{old_bill_amount:.2f})")
        
        # Add new consumption entry
        print(f"\n[3] ADDING NEW ENTRY: {test_qty}L on {test_date}")
        new_entry = Consumption(
            user_id=user_id,
            date=test_date,
            quantity=test_qty
        )
        db.add(new_entry)
        await db.commit()
        print(f"    Entry added successfully!")
        
        # Simulate what admin.py does - call BillingService
        print(f"\n[4] TRIGGERING BILL RECALCULATION...")
        await BillingService.recalculate_bill(db, user_id, month_str)
        await db.commit()
        print(f"    Recalculation complete!")
        
        # Verify new consumption total
        cons_result_new = await db.execute(
            select(func.sum(Consumption.quantity))
            .where(and_(
                Consumption.user_id == user_id,
                Consumption.date >= start_of_month
            ))
        )
        new_consumption = cons_result_new.scalar() or Decimal("0")
        
        # Verify new bill
        await db.refresh(bill)
        new_bill_liters = bill.total_liters
        new_bill_amount = bill.total_amount
        
        print(f"\n[5] AFTER UPDATE STATE:")
        print(f"    Consumption Total: {new_consumption:.3f} L (was {old_consumption:.3f}L)")
        print(f"    Bill Total:        {new_bill_liters:.3f} L (was {old_bill_liters:.3f}L)")
        print(f"    Bill Amount:       Rs.{new_bill_amount:.2f} (was Rs.{old_bill_amount:.2f})")
        
        # Verify consistency
        print(f"\n[6] VERIFICATION:")
        expected_consumption = old_consumption + test_qty
        
        tests_passed = 0
        tests_total = 3
        
        if new_consumption == expected_consumption:
            print(f"    [PASS] Consumption updated: {old_consumption} + {test_qty} = {new_consumption}")
            tests_passed += 1
        else:
            print(f"    [FAIL] Consumption mismatch: expected {expected_consumption}, got {new_consumption}")
        
        if new_bill_liters == new_consumption:
            print(f"    [PASS] Bill matches consumption: {new_bill_liters}L = {new_consumption}L")
            tests_passed += 1
        else:
            print(f"    [FAIL] Bill mismatch: bill={new_bill_liters}L vs consumption={new_consumption}L")
        
        expected_amount = new_consumption * user.price_per_liter
        if abs(new_bill_amount - expected_amount) < Decimal("0.10"):
            print(f"    [PASS] Amount correct: {new_bill_liters}L * Rs.{user.price_per_liter} = Rs.{new_bill_amount}")
            tests_passed += 1
        else:
            print(f"    [FAIL] Amount mismatch: expected Rs.{expected_amount}, got Rs.{new_bill_amount}")
        
        print(f"\n{'=' * 80}")
        if tests_passed == tests_total:
            print(f"ALL TESTS PASSED ({tests_passed}/{tests_total})")
        else:
            print(f"TESTS: {tests_passed}/{tests_total} PASSED")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(e2e_test())
