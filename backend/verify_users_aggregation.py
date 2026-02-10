
import asyncio
import httpx
from datetime import date

API_URL = "http://127.0.0.1:8000/api/v1"
ADMIN_EMAIL = "admin@dairy.com"
ADMIN_PASSWORD = "admin123"

async def verify():
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Login
        login_res = await client.post(
            f"{API_URL}/auth/login",
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.text}")
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login successful.")

        # 2. Fetch Users for 2026-02
        month = "2026-02"
        print(f"Fetching users for {month}...")
        users_res = await client.get(f"{API_URL}/users/?month={month}", headers=headers)
        
        if users_res.status_code != 200:
            print(f"Failed to fetch users: {users_res.text}")
            return

        users = users_res.json()
        target_user = next((u for u in users if float(u.get("total_liters", 0)) > 0), None)

        if not target_user:
            print("No users found with consumption > 0.")
            return

        print(f"Target User: {target_user['name']} (ID: {target_user['id']})")
        user_total = float(target_user['total_liters'])
        print(f"Users Endpoint Total: {user_total} L")

        # 3. Generate/Fetch Bill for this user
        print(f"Generating bill for user to compare...")
        bill_res = await client.post(
            f"{API_URL}/bills/generate/{target_user['id']}/{month}",
            headers=headers
        )
        
        if bill_res.status_code not in [200, 202]:
             print(f"Failed to generate bill: {bill_res.text}")
             # Try fetching existing bill if generate fails (maybe async issue?)
             bill_res = await client.get(f"{API_URL}/bills/{target_user['id']}/{month}", headers=headers)
             if bill_res.status_code != 200:
                 print(f"Failed to fetch bill: {bill_res.text}")
                 return

        bill_data = bill_res.json()
        bill_total = float(bill_data['total_liters'])
        print(f"Bills Endpoint Total: {bill_total} L")

        # 4. Compare
        diff = abs(user_total - bill_total)
        if diff < 0.001:
            print("SUCCESS: Totals match perfectly!")
        else:
            print(f"FAILURE: Mismatch detected! Diff: {diff}")
            print("Hypothesis: Users endpoint might still be missing data that Bills endpoint sees, or vice versa.")

if __name__ == "__main__":
    asyncio.run(verify())
