
import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000/api/v1"

async def test_re_registration():
    email = f"re_test_{int(asyncio.get_event_loop().time())}@example.com"
    payload = {
        "name": "First Attempt",
        "email": email,
        "phone": "1234567890",
        "address": "Address 1",
        "password": "password123"
    }
    
    async with httpx.AsyncClient() as client:
        print(f"--- Attempt 1 for {email} ---")
        try:
            res1 = await client.post(f"{BASE_URL}/registration/signup", json=payload)
            print(f"Status 1: {res1.status_code}")
            print(f"Body 1: {res1.text}")
            
            if res1.status_code != 200:
                print("First attempt failed.")
                return

            print(f"\n--- Attempt 2 (Re-registration) for {email} ---")
            payload["name"] = "Second Attempt"
            res2 = await client.post(f"{BASE_URL}/registration/signup", json=payload)
            print(f"Status 2: {res2.status_code}")
            print(f"Body 2: {res2.text}")
            
            if res2.status_code == 200:
                body = res2.json()
                if body.get("name") == "Second Attempt":
                    print("\nSuccess: Re-registration allowed and data updated!")
                else:
                    print("\nFailure: Data not updated.")
            else:
                print("\nFailure: Re-registration blocked.")
                
        except Exception as e:
            print(f"Error during test: {e}")

if __name__ == "__main__":
    asyncio.run(test_re_registration())
