import asyncio
import sys
import os
import logging
from datetime import date
from sqlalchemy import select, and_

# Silence SQL logs
logging.getLogger('sqlalchemy.engine').setLevel(logging.ERROR)

sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.user import User
from app.models.consumption import Consumption

async def verify_state():
    with open("verify_report_final.txt", "w", encoding="utf-8") as f:
        f.write("=" * 100 + "\n")
        f.write(f"{'DATE':12} | {'USER NAME':20} | {'TARGET':8} | {'QTY':8} | {'EXT':8} | {'REQ_Q':8} | {'REQ_E':8} | {'STATUS'}\n")
        f.write("-" * 100 + "\n")
        
        async with SessionLocal() as db:
            user_result = await db.execute(select(User))
            users = {u.id: u for u in user_result.scalars().all()}
            
            f.write("USER TARGETS:\n")
            for u in users.values():
                if u.role == "USER":
                    f.write(f"  - {u.name:20} : {u.daily_target_qty}L\n")
            f.write("-" * 100 + "\n")

            target_dates = [date(2026, 2, 13), date(2026, 2, 14)]
            cons_result = await db.execute(
                select(Consumption)
                .where(Consumption.date.in_(target_dates))
                .order_by(Consumption.date)
            )
            records = cons_result.scalars().all()
            
            for r in records:
                u = users.get(r.user_id)
                name = u.name if u else "Unknown"
                target = u.daily_target_qty if u else 0
                f.write(f"{str(r.date):12} | {name:20} | {target:8.3f} | {r.quantity:8.3f} | {r.extra_qty:8.3f} | {r.requested_quantity if r.requested_quantity is not None else 'None':8} | {r.requested_extra_qty if r.requested_extra_qty is not None else 'None':8} | {r.request_status}\n")

        f.write("=" * 100 + "\n")

if __name__ == "__main__":
    asyncio.run(verify_state())
