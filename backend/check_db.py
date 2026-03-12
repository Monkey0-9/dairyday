import asyncio
from sqlalchemy import select
from app.db.session import async_session
from app.models.user import User
from app.models.consumption import Consumption

async def main():
    async with async_session() as db:
        res = await db.execute(select(User.id, User.name, User.role, User.is_active))
        for row in res.all():
            print(f"User: {row.name}, Role: {row.role}, Active: {row.is_active}")
            
        res = await db.execute(select(Consumption.user_id, Consumption.date, Consumption.quantity))
        for row in res.all():
            print(f"Consumption: user={row.user_id}, date={row.date}, qty={row.quantity}")

asyncio.run(main())
