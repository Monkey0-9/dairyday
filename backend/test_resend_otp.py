
import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000/api/v1"

async def test_resend_otp():
    email = f"resend_test_{int(asyncio.get_event_loop().time())}@example.com"
    signup_payload = {
        "name": "Resend Test User",
        "email": email,
        "phone": "9876543210",
        "address": "Test Street",
        "password": "password123"
    }
    
    async with httpx.AsyncClient() as client:
        print(f"--- Signup for {email} ---")
        res1 = await client.post(f"{BASE_URL}/registration/signup", json=signup_payload)
        print(f"Signup Status: {res1.status_code}")
        
        if res1.status_code != 200:
            print("Signup failed.")
            return

        print(f"\n--- Resend OTP for {email} ---")
        res2 = await client.post(f"{BASE_URL}/registration/resend-otp", json={"email": email})
        print(f"Resend Status: {res2.status_code}")
        print(f"Resend Body: {res2.text}")
        
        if res2.status_code == 200:
            print("\nSuccess: Resend OTP endpoint working!")
        else:
            print("\nFailure: Resend OTP endpoint returned error.")

if __name__ == "__main__":
    asyncio.run(test_resend_otp())
