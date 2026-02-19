
import requests
import sys

sys.path.insert(0, ".")

BASE_URL = "http://127.0.0.1:8000/api/v1"

def main():
    print("--- LOGIN ATTEMPT (admin@dairyday.in) ---")
    try:
        # 1. Login
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": "admin@dairyday.in", "password": "admin123"},
            timeout=5
        )
        print(f"Login Status: {resp.status_code}")
        
        if resp.status_code == 200:
            token = resp.json()["access_token"]
            print("Login Successful.")
            headers = {"Authorization": f"Bearer {token}"}
            
            # 2. Fetch Users
            print("Fetching Users...")
            resp = requests.get(f"{BASE_URL}/users/?skip=0&limit=100", headers=headers, timeout=5)
            print(f"Users Status: {resp.status_code}")
            if resp.status_code == 200:
                users = resp.json()
                print(f"Users Count: {len(users)}")
                if len(users) > 0:
                     print(f"Sample User: {users[0]['email']} | Role: {users[0]['role']}")
            else:
                print(f"Error Body: {resp.text}")

            # 3. Fetch Bills
            print("Fetching Bills (Feb 2026)...")
            resp = requests.get(f"{BASE_URL}/bills/?month=2026-02", headers=headers, timeout=5)
            print(f"Bills Status: {resp.status_code}")
            if resp.status_code == 200:
                bills = resp.json()
                print(f"Bills Count: {len(bills)}")
            else:
                 print(f"Error Body: {resp.text}")

        else:
            print(f"Login Failed: {resp.text}")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    main()
