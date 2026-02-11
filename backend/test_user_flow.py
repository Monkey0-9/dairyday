import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "user1@dairy.com"
PASSWORD = "password123"

def test_flow():
    print(f"Testing flow for {EMAIL}...")
    
    # 1. Login
    login_url = f"{BASE_URL}/auth/login"
    payload = {"username": EMAIL, "password": PASSWORD}
    print(f"POST {login_url}")
    
    try:
        resp = requests.post(login_url, data=payload)
        resp.raise_for_status()
        data = resp.json()
        print("✅ Login Successful")
        access_token = data.get("access_token")
        if not access_token:
            print("❌ No access token received")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Login Failed: {e}")
        if resp:
            print(f"Response: {resp.text}")
        sys.exit(1)

    headers = {"Authorization": f"Bearer {access_token}"}

    # 2. Get Me (Dashboard Check)
    me_url = f"{BASE_URL}/users/me"
    print(f"GET {me_url}")
    try:
        resp = requests.get(me_url, headers=headers)
        resp.raise_for_status()
        user_data = resp.json()
        print(f"✅ User Profile Fetch Successful: {user_data.get('email')} ({user_data.get('role')})")
    except Exception as e:
        print(f"❌ User Fetch Failed: {e}")
        sys.exit(1)

    # 3. Get Consumption (Data Check)
    cons_url = f"{BASE_URL}/consumption/mine?month=2026-02"
    print(f"GET {cons_url}")
    try:
        resp = requests.get(cons_url, headers=headers)
        resp.raise_for_status()
        cons_data = resp.json()
        print(f"✅ Consumption Data Fetch Successful: {len(cons_data)} records found")
    except Exception as e:
        print(f"❌ Consumption Fetch Failed: {e}")
        sys.exit(1)

    print("\n🎯 FULL CUSTOMER FLOW VERIFIED SUCCESSFULLY")

if __name__ == "__main__":
    test_flow()
