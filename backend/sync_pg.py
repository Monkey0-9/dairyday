import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://")
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    DATABASE_URL = DATABASE_URL.replace("&channel_binding=require", "")
    DATABASE_URL = DATABASE_URL.replace("?sslmode=require", "")

async def sync_schema():
    print(f"Connecting to Postgres...")
    # Add ssl parameter explicitly for neon
    engine = create_async_engine(DATABASE_URL, echo=True, connect_args={"ssl": "require"})
    
    queries = [
        "ALTER TABLE consumption ADD COLUMN IF NOT EXISTS requested_quantity NUMERIC(12, 3)",
        "ALTER TABLE consumption ADD COLUMN IF NOT EXISTS requested_extra_qty NUMERIC(12, 3)",
        "ALTER TABLE consumption ADD COLUMN IF NOT EXISTS request_status VARCHAR(20)",
        "ALTER TABLE consumption ADD COLUMN IF NOT EXISTS request_note VARCHAR",
        "ALTER TABLE consumption ADD COLUMN IF NOT EXISTS confirmed_by UUID",
    ]
    
    async with engine.begin() as conn:
        for q in queries:
            try:
                await conn.execute(text(q))
                print(f"SUCCESS: {q}")
            except Exception as e:
                print(f"SKIPPED/FAILED: {q} - {e}")
                
if __name__ == "__main__":
    asyncio.run(sync_schema())
