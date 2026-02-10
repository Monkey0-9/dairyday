
import asyncio
import sys
import os

sys.path.append(os.getcwd())

from sqlalchemy import select, func
from app.db.session import SessionLocal
from app.models.user import User
from app.models.consumption import Consumption
from app.models.bill import Bill
from app.schemas.user import User as UserSchema
from app.schemas.bill import Bill as BillSchema
from uuid import UUID
from datetime import date

async def check():
    session = SessionLocal()
    async with session as db:
        # Replicate read_users logic
        users_result = await db.execute(select(User).limit(5))
        users = users_result.scalars().all()
        
        today = date.today()
        start_of_month = date(today.year, today.month, 1)
        
        consumption_result = await db.execute(
            select(
                Consumption.user_id,
                func.sum(Consumption.quantity).label("total")
            )
            .where(
                Consumption.user_id.in_([u.id for u in users]),
                Consumption.date >= start_of_month
            )
            .group_by(Consumption.user_id)
        )
        all_cons = consumption_result.all()
        print(f"Raw consumption rows: {all_cons}")
        
        consumption_map = {row[0]: row[1] for row in all_cons}
        print(f"Consumption map keys types: {[type(k) for k in consumption_map.keys()]}")
        
        for user in users:
            u_id = user.id
            total = consumption_map.get(u_id, 0)
            print(f"User {user.name} ({type(u_id)} {u_id}): Aggregated Total = {total}")

        # Replicate list_bills logic
        month_str = "2026-02"
        query = (
            select(Bill, User.name.label("user_name"))
            .join(User, Bill.user_id == User.id)
            .where(Bill.month == month_str)
        )
        result = await db.execute(query)
        rows = result.all()
        print(f"\nBills query rows found: {len(rows)}")
        for bill_obj, user_name in rows[:3]:
            bill_data = BillSchema.model_validate(bill_obj)
            bill_data.user_name = user_name
            print(f"Bill for {bill_data.user_name} (direct: {user_name}): liters={bill_data.total_liters}, name_in_schema={bill_data.user_name}")

if __name__ == "__main__":
    asyncio.run(check())
