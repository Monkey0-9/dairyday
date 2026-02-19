
import requests
import sys

sys.path.insert(0, ".")

BASE_URL = "http://127.0.0.1:8000/api/v1"

def main():
    print("--- LOGIN ATTEMPT (admin@dairy.com) ---")
    payload = {
        "username": "admin@dairy.com", 
        "password": "admin123"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", data=payload, timeout=10)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print("Login Successful.")
            token = resp.json().get("access_token")
            print(f"Token: {token[:20]}...")
        else:
            print(f"Login Failed: {resp.text}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
