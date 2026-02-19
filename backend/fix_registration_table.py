
import asyncio
import sys
import os

# Add parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.db.session import engine
from app.db.base import Base

async def fix_table():
    print("Connecting to database to fix registration_requests table...")
    async with engine.begin() as conn:
        # Drop the broken table
        print("Dropping broken registration_requests table if it exists...")
        await conn.execute(text("DROP TABLE IF EXISTS registration_requests"))
        
        # Recreate missing tables defined in Base.metadata
        print("Recreating table from metadata...")
        await conn.run_sync(Base.metadata.create_all)
        
    print("Success: registration_requests table has been recreated successfully.")

if __name__ == "__main__":
    asyncio.run(fix_table())
