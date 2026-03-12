import asyncio
from app.db.session import SessionLocal
from app.models.user import User
from sqlalchemy import select

async def main():
    async with SessionLocal() as session:
        result = await session.execute(select(User))
        for u in result.scalars().all():
            if "H0L44w5HQZPk4gYhXeo5auegvM1W5nrmwtyvxT40ZNsJ1ykrotg5i" in u.hashed_password:
                print(f"Found match: email={u.email}, name={u.name}")

if __name__ == "__main__":
    asyncio.run(main())
