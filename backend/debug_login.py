
import asyncio
import sys
import httpx
from sqlalchemy import select

sys.path.insert(0, ".")

OUT_FILE = "debug_login_output.txt"

async def main():
    log_lines = []
    def log(msg):
        print(msg)
        log_lines.append(str(msg))

    try:
        from app.db.session import SessionLocal, engine
        from app.models.user import User

        log("--- ADMIN USERS IN DB ---")
        async with SessionLocal() as db:
            res = await db.execute(select(User).where(User.role == "ADMIN"))
            admins = res.scalars().all()
            for a in admins:
                log(f"  {a.email} | Active: {a.is_active} | Role: {a.role}")
            
            # Also check SUPERADMIN just in case
            res = await db.execute(select(User).where(User.role == "SUPERADMIN"))
            supers = res.scalars().all()
            for s in supers:
                 log(f"  {s.email} | Active: {s.is_active} | Role: {s.role}")
        
        await engine.dispose()
    except Exception as e:
        log(f"DB Error: {e}")

    log("\n--- LOGIN ATTEMPT (admin@dairyday.in) ---")
    async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=10) as client:
        try:
            resp = await client.post(
                "/api/v1/auth/login",
                data={"username": "admin@dairyday.in", "password": "admin123"}
            )
            log(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                log("Login OK")
                token = resp.json().get("access_token")
                
                # Try fetching users
                resp2 = await client.get("/api/v1/users/?skip=0&limit=5", headers={"Authorization": f"Bearer {token}"})
                log(f"Fetch Users: {resp2.status_code}")
                if resp2.status_code == 200:
                    users = resp2.json()
                    log(f"Users found: {len(users)}")
                    if users:
                        log(f"Sample: {users[0]}")
                else:
                    log(resp2.text)
            else:
                log(f"Body: {resp.text}")
        except Exception as e:
            log(f"Network Error: {e}")

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines))
    print(f"Written to {OUT_FILE}")

if __name__ == "__main__":
    asyncio.run(main())
