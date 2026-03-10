import asyncio
import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.repositories.consumption_repository import ConsumptionRepository

# Database setup
DATABASE_URL = "sqlite+aiosqlite:///./dairy-elite.db"
engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def test_get_mine():
    async with async_session() as db:
        repo = ConsumptionRepository(db)
        
        # We know from seed data the user has ID "22222222-2222-2222-2222-222222222222" (from seed_customer.py)
        # customer email: prakashpraveen239@gmail.com
        
        # Let's get the user ID first
        from sqlalchemy import text
        result = await db.execute(text("SELECT id FROM users WHERE email='prakashpraveen239@gmail.com'"))
        user_row = result.first()
        if not user_row:
            print("User not found!")
            return
            
        user_id = user_row[0]
        print(f"Testing for user {user_id}")
        
        start = datetime.date(2026, 3, 1)
        end = datetime.date(2026, 3, 31)
        
        try:
            records = await repo.get_for_user_in_range(user_id, start, end)
            print(f"Success! Found {len(records)} records")
        except Exception as e:
            import traceback
            print("FAILED WITH EXCEPTION:")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_get_mine())
