import requests

BASE_URL = "http://localhost:8000/api/v1"

def test_login_and_profile(email, password):
    print(f"Testing full journey for {email}...")
    try:
        # 1. Login
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": email, "password": password},
            timeout=10
        )
        if resp.status_code != 200:
            print(f"Login Failed: {resp.status_code} - {resp.text}")
            return
        
        data = resp.data = resp.json()
        token = data.get("access_token")
        print(f"Login Success. Token: {token[:20]}...")
        
        # 2. Get Profile
        profile_resp = requests.get(
            f"{BASE_URL}/users/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        print(f"Profile Status: {profile_resp.status_code}")
        print(f"Profile Response: {profile_resp.text}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    try:
        test_login_and_profile("admin@dairy.com", "admin123")
        print("-" * 20)
        test_login_and_profile("user1@dairy.com", "password123")
    except Exception as e:
        import traceback
        print(f"CRITICAL ERROR in test script: {e}")
        traceback.print_exc()
