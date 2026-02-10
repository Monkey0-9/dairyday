"""
Simulate the exact API response for users endpoint
"""
import asyncio
import sys
import os
import json

sys.path.append(os.getcwd())

from sqlalchemy import select, func, and_
from datetime import date
from decimal import Decimal
from app.db.session import SessionLocal
from app.models.user import User
from app.models.consumption import Consumption
from app.schemas.user import User as UserSchema


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


async def simulate_api_response():
    session = SessionLocal()
    async with session as db:
        print("=" * 80)
        print("SIMULATING API RESPONSE (what /api/v1/users/ returns)")
        print("=" * 80)
        
        today = date.today()
        start_of_month = date(today.year, today.month, 1)
        
        # Single query with left join and aggregation
        query = (
            select(
                User,
                func.sum(Consumption.quantity).label("month_liters")
            )
            .outerjoin(
                Consumption,
                and_(
                    Consumption.user_id == User.id,
                    Consumption.date >= start_of_month
                )
            )
            .group_by(User.id)
        )
        
        result = await db.execute(query)
        rows = result.all()
        
        enriched_users = []
        for user, month_liters in rows:
            user_data = UserSchema.model_validate(user)
            user_data.total_liters = month_liters or 0
            enriched_users.append(user_data)
        
        print(f"\nTotal users: {len(enriched_users)}")
        print("\nJSON Response Preview (first 3 users):")
        print("-" * 60)
        
        for user in enriched_users[:3]:
            user_dict = user.model_dump()
            print(f"\n{user_dict['name']}:")
            print(f"  id: {user_dict['id']}")
            print(f"  total_liters: {user_dict['total_liters']} (type: {type(user_dict['total_liters']).__name__})")
            print(f"  price_per_liter: {user_dict['price_per_liter']}")
        
        # Check if total_liters is properly serialized
        print("\n\nFull JSON check:")
        for user in enriched_users:
            user_dict = user.model_dump()
            if user_dict.get("role") == "USER":
                print(f"  {user_dict['name']:20} total_liters={user_dict.get('total_liters', 'MISSING')}")


if __name__ == "__main__":
    asyncio.run(simulate_api_response())
