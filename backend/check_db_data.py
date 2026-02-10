
import asyncio
from sqlalchemy import text
from app.db.session import SessionLocal

async def check_data():
    async with SessionLocal() as db:
        print("--- Checking Raw DB Data for 2026-02 ---")
        query = text("""
            SELECT 
                u.name, 
                COALESCE(SUM(c.quantity), 0) as consumed_feb
            FROM users u
            LEFT JOIN consumption c 
                ON u.id = c.user_id 
                AND c.date >= '2026-02-01' 
                AND c.date <= '2026-02-28'
            WHERE u.role = 'USER'
            GROUP BY u.id, u.name
            ORDER BY u.name;
        """)
        # Note: Bills.py/Users.py use strict range (start/end inclusive) usually or < NextMonth.
        # My updated users.py uses <= end_date (inclusive).
        # Let's check what the DB actually holds.
        
        result = await db.execute(query)
        rows = result.all()
        for row in rows:
            print(f"{row[0]}: {row[1]} L")

if __name__ == "__main__":
    asyncio.run(check_data())
