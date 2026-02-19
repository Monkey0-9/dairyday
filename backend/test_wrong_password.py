
import requests
import sys

sys.path.insert(0, ".")

BASE_URL = "http://127.0.0.1:8000/api/v1"

def main():
    print("--- TESTING WRONG PASSWORD ---")
    
    # 1. Login with wrong password
    print("Attempting login with username 'user1@dairy.com' and password 'WRONG_PASSWORD'...")
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": "user1@dairy.com", "password": "WRONG_PASSWORD"},
            timeout=5
        )
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
        
        if resp.status_code == 401 or resp.status_code == 400: # 400 or 401 is acceptable for login failure
            print("PASS: Correctly rejected.")
        elif resp.status_code == 500:
            print("FAIL: Cached 500 Internal Server Error.")
        else:
            print(f"FAIL: Unexpected status {resp.status_code}")

    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    main()
