import asyncio
import httpx
import sys

# Configuration
API_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "admin@dairy.com"
ADMIN_PASS = "admin123"

async def test_mark_paid(client: httpx.AsyncClient):
    print("\n--- Testing MARK AS PAID Flow ---")
    
    # 1. Login as Admin
    print("1. Logging in as Admin...")
    response = await client.post(
        f"{API_URL}/auth/login",
        data={"username": ADMIN_EMAIL, "password": ADMIN_PASS},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if response.status_code != 200:
        print(f"FAILED: Login failed {response.status_code}")
        return
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Find an Unpaid Bill (or Create one via script logic if needed, but let's list bills first)
    # We don't have a direct 'list all bills' endpoint for admin in the snippets seen, 
    # but we can try to fetch bills for a user if we knew one.
    # Alternatively, we can use the 'bills/generate-all' to ensure bills exist.
    
    # Let's try to get bills from the ID we known from previous tests or list endpoints.
    # Actually, `billsApi.list` in frontend uses `GET /bills/?month=...`.
    # Let's assume there's at least one bill.
    
    import datetime
    month = datetime.date.today().strftime("%Y-%m")
    print(f"2. Listing bills for {month}...")
    response = await client.get(f"{API_URL}/bills/?month={month}", headers=headers)
    
    if response.status_code != 200:
        print(f"FAILED: List bills failed {response.status_code}")
        return

    bills = response.json()
    unpaid_bill = next((b for b in bills if b["status"] == "UNPAID"), None)
    
    if not unpaid_bill:
        print("INFO: No UNPAID bills found to test. Skipping mark-paid.")
        return

    bill_id = unpaid_bill["id"]
    print(f"3. Marking Bill {bill_id} as PAID...")
    
    response = await client.post(f"{API_URL}/payments/mark-paid/{bill_id}", headers=headers)
    
    if response.status_code == 200:
        print("SUCCESS: Bill marked as PAID.")
    else:
        print(f"FAILED: Mark paid failed {response.status_code} - {response.text}")

async def main():
    async with httpx.AsyncClient() as client:
        await test_mark_paid(client)

if __name__ == "__main__":
    import asyncio
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
