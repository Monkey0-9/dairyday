import asyncio
import sys
import os
from datetime import date
from sqlalchemy import select, and_
from app.db.session import SessionLocal
from app.models.consumption import Consumption
from app.models.user import User

sys.path.append(os.getcwd())

async def run():
    async with SessionLocal() as db:
        target_dates = [date(2026, 2, 13), date(2026, 2, 14)]
        print(f"Checking Consumption for: {target_dates}")
        
        result = await db.execute(
            select(Consumption)
            .where(Consumption.date.in_(target_dates))
        )
        records = result.scalars().all()
        
        for r in records:
            user_result = await db.execute(select(User).where(User.id == r.user_id))
            user = user_result.scalars().first()
            user_name = user.name if user else "Unknown"
            print(f"Date: {r.date} | User: {user_name:15} | Qty: {r.quantity:5} | Extra: {r.extra_qty:5} | Req Qty: {r.requested_quantity:5} | Req Extra: {r.requested_extra_qty:5} | Req Status: {r.request_status}")

if __name__ == "__main__":
    asyncio.run(run())
