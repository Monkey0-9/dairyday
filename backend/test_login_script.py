import requests
import sys

base_url = "http://127.0.0.1:8000/api/v1"

def test_login(email, password):
    print(f"Testing login for {email}...")
    try:
        # The frontend API uses JSON for /auth/login
        resp = requests.post(f"{base_url}/auth/login", json={"username": email, "password": password})
        if resp.status_code == 200:
            print(f"✅ Success! Token received: {resp.json().get('access_token')[:20]}...")
            return True
        else:
            print(f"❌ Failed ({resp.status_code}): {resp.text}")
            return False
    except Exception as e:
        print(f"❌ Error connecting: {e}")
        return False

if __name__ == "__main__":
    admin_ok = test_login("admin@dairy.com", "admin123")
    user_ok = test_login("prakashpraveen239@gmail.com", "admin123")
    
    if not (admin_ok or user_ok):
        sys.exit(1)
