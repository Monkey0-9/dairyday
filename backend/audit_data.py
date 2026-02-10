"""
Comprehensive Data Consistency Audit for DairyOS
This script checks:
1. All users and their profiles (name, price)
2. All consumption entries grouped by user
3. All bills and their calculated values
4. Verifies that bill totals match consumption totals
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


async def audit():
    session = SessionLocal()
    async with session as db:
        month_str = "2026-02"
        year, month_num = 2026, 2
        start_date = date(year, month_num, 1)
        _, last_day = monthrange(year, month_num)
        end_date = date(year, month_num, last_day)

        print("=" * 80)
        print("DAIRYOS DATA CONSISTENCY AUDIT - February 2026")
        print("=" * 80)

        # 1. Fetch all USER-role users
        users_result = await db.execute(
            select(User).where(User.role == "USER")
        )
        users = users_result.scalars().all()
        print(f"\n[1] USERS TABLE ({len(users)} customers found)")
        print("-" * 60)

        user_map = {}
        for u in users:
            user_map[u.id] = {
                "name": u.name,
                "price_per_liter": u.price_per_liter,
            }
            print(f"  ID: {str(u.id)[:8]}... | Name: {u.name:20} | Rate: Rs.{u.price_per_liter}/L")

        # 2. Fetch consumption grouped by user for February
        print(f"\n[2] CONSUMPTION TABLE (Feb 2026)")
        print("-" * 60)
        consumption_result = await db.execute(
            select(
                Consumption.user_id,
                func.sum(Consumption.quantity).label("total_liters"),
                func.count(Consumption.id).label("entry_count")
            )
            .where(
                and_(
                    Consumption.date >= start_date,
                    Consumption.date <= end_date
                )
            )
            .group_by(Consumption.user_id)
        )
        consumption_data = consumption_result.all()
        
        consumption_map = {}
        for user_id, total_liters, entry_count in consumption_data:
            consumption_map[user_id] = {
                "total_liters": total_liters,
                "entry_count": entry_count,
            }
            user_name = user_map.get(user_id, {}).get("name", "UNKNOWN USER")
            print(f"  ID: {str(user_id)[:8]}... | Name: {user_name:20} | Entries: {entry_count:3} | Total: {total_liters:.3f} L")

        # 3. Fetch bills for February
        print(f"\n[3] BILLS TABLE (Feb 2026)")
        print("-" * 60)
        bills_result = await db.execute(
            select(Bill).where(Bill.month == month_str)
        )
        bills = bills_result.scalars().all()
        
        bill_map = {}
        for b in bills:
            bill_map[b.user_id] = {
                "total_liters": b.total_liters,
                "total_amount": b.total_amount,
                "status": b.status,
            }
            user_name = user_map.get(b.user_id, {}).get("name", "UNKNOWN - GUEST?")
            print(f"  ID: {str(b.user_id)[:8]}... | Name: {user_name:20} | Liters: {b.total_liters:8.3f} L | Amount: Rs.{b.total_amount:>10.2f} | {b.status}")

        # 4. Cross-reference and find mismatches
        print(f"\n[4] CONSISTENCY CHECK")
        print("=" * 80)
        
        all_user_ids = set(user_map.keys()) | set(consumption_map.keys()) | set(bill_map.keys())
        
        mismatches = []
        for uid in all_user_ids:
            user = user_map.get(uid)
            cons = consumption_map.get(uid, {"total_liters": Decimal("0"), "entry_count": 0})
            bill = bill_map.get(uid)
            
            user_name = user["name"] if user else "NO USER RECORD"
            cons_liters = cons["total_liters"] if cons else Decimal("0")
            bill_liters = bill["total_liters"] if bill else None
            
            # Check if bill liters matches consumption liters
            if bill and cons_liters != bill_liters:
                mismatches.append({
                    "user_id": uid,
                    "name": user_name,
                    "consumption_liters": cons_liters,
                    "bill_liters": bill_liters,
                    "difference": cons_liters - bill_liters,
                })
        
        if mismatches:
            print(f"\n!! FOUND {len(mismatches)} MISMATCHES:")
            for m in mismatches:
                print(f"  * {m['name']}: Consumption={m['consumption_liters']:.3f}L vs Bill={m['bill_liters']:.3f}L (Diff: {m['difference']:.3f}L)")
        else:
            print("\n OK: All consumption and bill totals match!")

        # 5. Check for orphaned bills (bills without matching users)
        orphan_bills = [uid for uid in bill_map if uid not in user_map]
        if orphan_bills:
            print(f"\n!! FOUND {len(orphan_bills)} ORPHANED BILLS (no matching user):")
            for uid in orphan_bills:
                print(f"  * Bill for user_id {uid}")
        
        return mismatches


if __name__ == "__main__":
    asyncio.run(audit())
