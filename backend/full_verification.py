
import httpx
import asyncio
import sqlite3
import uuid
import sys

BASE_URL = "http://localhost:8000/api/v1"

async def verify_system():
    # 1. ADMIN FLOW
    print("\n--- [START] ADMIN FLOW VERIFICATION ---")
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Login with known credentials
        login_data = {"username": "admin@dairy.com", "password": "admin123"}
        print(f"[DEBUG] POST {BASE_URL}/auth/login with {login_data['username']}...")
        try:
            r = await client.post(f"{BASE_URL}/auth/login", data=login_data)
        except Exception as e:
            print(f"[ERROR] Admin Login Exception: {e}")
            return

        if r.status_code != 200:
            print(f"[ERROR] Admin Login Failed (Status {r.status_code}). Response: {r.text}")
            # Try fallback
            login_data["username"] = "admin@example.com"
            login_data["password"] = "password"
            print(f"[DEBUG] Falling back to {login_data['username']}...")
            r = await client.post(f"{BASE_URL}/auth/login", data=login_data)
        
        if r.status_code == 200:
            token = r.json().get("access_token")
            params = {"Authorization": f"Bearer {token}"}
            print("[SUCCESS] Admin Login Successful!")
            
            # List Users
            print(f"[DEBUG] GET {BASE_URL}/users/...")
            r = await client.get(f"{BASE_URL}/users/", headers=params)
            if r.status_code == 200:
                print(f"[SUCCESS] Admin can list users ({len(r.json())} found).")
            else:
                print(f"[ERROR] Failed to list users: {r.text}")
        else:
            print("[CRITICAL] Could not verify Admin flow due to login failure.")

    # 2. USER SIGNUP & OTP FLOW
    print("\n--- [START] USER SIGNUP & OTP VERIFICATION ---")
    test_email = f"verify_{uuid.uuid4().hex[:8]}@example.com"
    signup_data = {
        "email": test_email,
        "name": "Verification Test User",
        "phone": "9988776655",
        "password": "password123"
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        print(f"[DEBUG] Signing up new user: {test_email}...")
        r = await client.post(f"{BASE_URL}/registration/signup", json=signup_data)
        if r.status_code in [200, 201]:
            print("[SUCCESS] Signup request sent successfully!")
            
            # Fetch OTP from DB
            print("[DEBUG] Fetching OTP from DB (waiting 2s)...")
            await asyncio.sleep(2) 
            try:
                conn = sqlite3.connect('dairy.db')
                cur = conn.cursor()
                cur.execute("SELECT otp_code FROM registration_requests WHERE email = ?", (test_email,))
                row = cur.fetchone()
                conn.close()
            except Exception as e:
                print(f"[ERROR] DB Query Exception: {e}")
                return
            
            if row:
                otp = row[0]
                print(f"[SUCCESS] Retrieved OTP from DB: {otp}")
                
                # Verify OTP
                print(f"[DEBUG] Verifying OTP {otp} for {test_email}...")
                verify_data = {"email": test_email, "otp_code": otp}
                r = await client.post(f"{BASE_URL}/registration/verify-otp", json=verify_data)
                if r.status_code == 200:
                    print("[SUCCESS] OTP Verification Successful!")
                    
                    # Final Login with new user
                    print(f"[DEBUG] Logging in with new user {test_email}...")
                    login_user = {"username": test_email, "password": "password123"}
                    r = await client.post(f"{BASE_URL}/auth/login", data=login_user)
                    if r.status_code == 200:
                        print(f"[SUCCESS] New user {test_email} can login successfully.")
                    else:
                        print(f"[ERROR] User login failed after verification: {r.text}")
                else:
                    print(f"[ERROR] OTP Verification Failed: {r.text}")
            else:
                print("[ERROR] Failed to find OTP in database for test email.")
        else:
            print(f"[ERROR] Signup Failed: {r.text}")

if __name__ == "__main__":
    asyncio.run(verify_system())
