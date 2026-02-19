
import asyncio
import sys
import httpx
from sqlalchemy import select, func, text

sys.path.insert(0, ".")

OUT_FILE = "debug_output.txt"
BASE_URL = "http://localhost:8000/api/v1"

async def main():
    log_lines = []
    def log(msg):
        print(msg)
        log_lines.append(str(msg))

    log("--- 1. DATABASE CHECK ---")
    try:
        from app.db.session import SessionLocal, engine
        from app.models.user import User
        from app.models.consumption import Consumption
        from app.models.bill import Bill
        from app.models.payment import Payment

        async with SessionLocal() as db:
            # Users
            res = await db.execute(select(func.count()).select_from(User))
            log(f"Total Users: {res.scalar()}")
            
            res = await db.execute(select(User).limit(3))
            users = res.scalars().all()
            for u in users:
                log(f"  User: {u.id} | {u.email} | Role: {u.role} | Active: {u.is_active}")

            # Consumption
            res = await db.execute(select(func.count()).select_from(Consumption))
            log(f"Total Consumption: {res.scalar()}")

            # Bills
            res = await db.execute(select(func.count()).select_from(Bill))
            log(f"Total Bills: {res.scalar()}")

            # Payments
            res = await db.execute(select(func.count()).select_from(Payment))
            log(f"Total Payments: {res.scalar()}")
        
        await engine.dispose()
    except Exception as e:
        log(f"DB Check Failed: {e}")
        import traceback
        log(traceback.format_exc())

    log("\n--- 2. API CHECK ---")
    try:
        async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=10) as client:
            # Login
            log("Logging in as Admin...")
            resp = await client.post(
                "/api/v1/auth/login",
                data={"username": "admin@dairyday.in", "password": "admin123"}
            )
            if resp.status_code != 200:
                log(f"Login Failed: {resp.status_code} {resp.text}")
                return
            
            token = resp.json().get("access_token")
            log("Login Successful. Token obtained.")
            headers = {"Authorization": f"Bearer {token}"}

            # Fetch Customers
            log("Fetching /api/v1/users/?skip=0&limit=100")
            resp = await client.get("/api/v1/users/?skip=0&limit=100", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                log(f"API Users Count: {len(data)}")
                if len(data) > 0:
                     log(f"First User: {data[0]}")
            else:
                log(f"API Users Failed: {resp.status_code} {resp.text}")

            # Fetch Bills
            log("Fetching /api/v1/bills/?month=2026-02")
            resp = await client.get("/api/v1/bills/?month=2026-02", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                log(f"API Bills (Feb) Count: {len(data)}")
            else:
                log(f"API Bills Failed: {resp.status_code} {resp.text}")

    except Exception as e:
        log(f"API Check Failed: {e}")

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines))
    print(f"Output written to {OUT_FILE}")

if __name__ == "__main__":
    asyncio.run(main())
