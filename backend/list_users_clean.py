import asyncio
import sys
import os
import logging

# Disable all logging
logging.disable(logging.CRITICAL)
os.environ['SQLALCHEMY_SILENCE_UBER_WARNING'] = '1'

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.user import User

sys.path.append(os.getcwd())

async def run():
    async with SessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        print("___RESULT_START___")
        for u in users:
            print(f"USER_DATA|{u.name}|{u.daily_target_qty}|{u.role}")
        print("___RESULT_END___")

if __name__ == "__main__":
    asyncio.run(run())
