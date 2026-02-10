"""
Test API endpoints to verify what data is being returned
"""
import asyncio
import sys
import os

sys.path.append(os.getcwd())

from sqlalchemy import select, func, and_
from datetime import date
from app.db.session import SessionLocal
from app.models.user import User
from app.models.consumption import Consumption


async def test_apis():
    session = SessionLocal()
    async with session as db:
        print("=" * 80)
        print("API DATA TEST")
        print("=" * 80)
        
        # Test what the Users API should return (simulating the endpoint logic)
        today = date.today()
        start_of_month = date(today.year, today.month, 1)
        
        # Get all users
        users_result = await db.execute(
            select(User).where(User.role == "USER")
        )
        users = users_result.scalars().all()
        
        print(f"\n[1] USERS API (what /api/v1/users/ should return)")
        print("-" * 60)
        
        for user in users:
            # Calculate consumption for this user
            cons_result = await db.execute(
                select(func.sum(Consumption.quantity))
                .where(and_(
                    Consumption.user_id == user.id,
                    Consumption.date >= start_of_month
                ))
            )
            total_liters = cons_result.scalar() or 0
            
            print(f"  {user.name:20} | total_liters: {total_liters}")
        
        # Test what the Consumption Grid API should return
        print(f"\n[2] CONSUMPTION GRID API (what /api/v1/consumption/grid?month=2026-02 should return)")
        print("-" * 60)
        
        # Get all consumption for February 2026
        month = "2026-02"
        year, month_num = 2026, 2
        start_date = date(year, month_num, 1)
        end_date = date(year, month_num, 28)
        
        consumption_result = await db.execute(
            select(Consumption)
            .where(and_(
                Consumption.date >= start_date,
                Consumption.date <= end_date
            ))
        )
        consumptions = consumption_result.scalars().all()
        
        print(f"  Total consumption rows: {len(consumptions)}")
        if consumptions:
            print("  Sample entries:")
            for c in consumptions[:5]:
                print(f"    user_id={str(c.user_id)[:8]}..., date={c.date}, qty={c.quantity}")
        else:
            print("  NO CONSUMPTION DATA FOUND!")


if __name__ == "__main__":
    asyncio.run(test_apis())
