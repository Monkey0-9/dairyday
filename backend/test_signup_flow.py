
import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000/api/v1"

async def test_signup():
    print("Testing signup flow...")
    payload = {
        "name": "Test User",
        "email": f"test_{int(asyncio.get_event_loop().time())}@example.com",
        "phone": "9988776655",
        "address": "Test Address",
        "password": "password123"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{BASE_URL}/registration/signup", json=payload)
            print(f"Status Code: {response.status_code}")
            print(f"Response Body: {response.text}")
            
            if response.status_code == 200:
                print("Signup test successful!")
                return True
            else:
                print("Signup test failed.")
                return False
        except Exception as e:
            print(f"Error during signup test: {e}")
            return False

if __name__ == "__main__":
    asyncio.run(test_signup())
