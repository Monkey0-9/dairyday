import asyncio
import sys
import os
from datetime import date
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.user import User
from app.models.consumption import Consumption

sys.path.append(os.getcwd())

async def diagnose_db():
    print("=" * 80)
    print("DIAGNOSTIC DUMP: Users & Consumption")
    print("=" * 80)
    
    async with SessionLocal() as db:
        # 1. Check all users
        print("\n[USERS]")
        user_result = await db.execute(select(User))
        users = user_result.scalars().all()
        for u in users:
            print(f"ID: {u.id} | Name: {u.name:20} | Target: {u.daily_target_qty}L | Role: {u.role}")
        
        # 2. Check consumption for Feb 14 (date from screenshot)
        print("\n[CONSUMPTION - Feb 14, 2026]")
        cons_result = await db.execute(
            select(Consumption).where(Consumption.date == date(2026, 2, 14))
        )
        records = cons_result.scalars().all()
        if not records:
            print("No records found for Feb 14.")
        for r in records:
            print(f"User: {r.user_id} | Qty: {r.quantity}L | Extra: {r.extra_qty}L | Req Qty: {r.requested_quantity}L | Status: {r.request_status}")

        # 3. Check all pending requests
        print("\n[ALL PENDING REQUESTS]")
        req_result = await db.execute(
            select(Consumption).where(Consumption.request_status == 'PENDING')
        )
        reqs = req_result.scalars().all()
        for r in reqs:
            print(f"Date: {r.date} | User: {r.user_id} | Qty: {r.quantity}L | Req Qty: {r.requested_quantity}L")

if __name__ == "__main__":
    asyncio.run(diagnose_db())
