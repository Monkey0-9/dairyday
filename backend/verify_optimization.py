import sys
import os
import asyncio
from sqlalchemy import text

# Add backend to path
sys.path.append(r"c:\dairy\backend")

async def verify():
    print("Verifying optimizations...")
    
    # 1. Verify Imports
    try:
        from app.api.v1.endpoints import admin
        print("PASS: app.api.v1.endpoints.admin imported successfully.")
    except Exception as e:
        print(f"FAIL: Failed to import admin module: {e}")
        import traceback
        traceback.print_exc()
        return

    # 2. Verify Index
    try:
        from app.db.session import SessionLocal
        async with SessionLocal() as session:
            result = await session.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_consumption_date'"))
            row = result.scalar()
            if row:
                print(f"PASS: Index '{row}' found in database.")
            else:
                print("FAIL: Index 'idx_consumption_date' NOT found.")
    except Exception as e:
        print(f"FAIL: Failed to verify index: {e}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify())
