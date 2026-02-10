import asyncio
from sqlalchemy import text
from app.db.session import SessionLocal

async def add_columns():
    print("Adding columns to bills table...")
    async with SessionLocal() as session:
        try:
            try:
                await session.execute(text("ALTER TABLE bills ADD COLUMN is_locked BOOLEAN DEFAULT FALSE"))
                print("Added column 'is_locked'")
            except Exception as e:
                print(f"'is_locked' might already exist: {e}")

            try:
                await session.execute(text("ALTER TABLE bills ADD COLUMN generated_at TIMESTAMP WITH TIME ZONE"))
                print("Added column 'generated_at'")
            except Exception as e:
                print(f"'generated_at' might already exist: {e}")
            
            await session.execute(text("UPDATE bills SET is_locked = TRUE WHERE status = 'PAID' OR pdf_url IS NOT NULL"))
            print("Backfilled is_locked for existing final bills")

            await session.commit()
            print("Done.")
        except Exception as e:
            print(f"Error: {e}")
            await session.rollback()

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(add_columns())
