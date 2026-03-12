import asyncio
from app.db.session import async_session
from app.models.user import User
from app.models.consumption import Consumption
from sqlalchemy import select

async def main():
    async with async_session() as db:
        with open('debug.txt', 'w', encoding='utf-8') as f:
            res = await db.execute(select(User.id, User.name, User.role, User.is_active))
            users = res.all()
            f.write('USERS:\n')
            for u in users:
                f.write(str(u) + '\n')
                
            res2 = await db.execute(select(Consumption.user_id, Consumption.date, Consumption.quantity))
            cons = res2.all()
            f.write('CONS:\n')
            for c in cons:
                f.write(str(c) + '\n')

if __name__ == "__main__":
    asyncio.run(main())
