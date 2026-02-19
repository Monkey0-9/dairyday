import asyncio
import sys
import os

# Add current directory (backend) to sys.path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from sqlalchemy import text

async def check():
    session = SessionLocal()
    try:
        result = await session.execute(text('SELECT name, role, is_active FROM users'))
        users = result.fetchall()
        with open("../scripts/user_dump_root_context.txt", "w") as f:
            f.write(f"Total Users: {len(users)}\n")
            for u in users:
                f.write(f"Name: {u.name}, Role: {u.role}, Active: {u.is_active}\n")
    except Exception as e:
        with open("../scripts/user_dump_root_context.txt", "w") as f:
            f.write(f"Error: {e}\n")
    finally:
        await session.close()

if __name__ == "__main__":
    asyncio.run(check())
