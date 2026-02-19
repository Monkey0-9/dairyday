
import requests
import sys

sys.path.insert(0, ".")

BASE_URL = "http://127.0.0.1:8000/api/v1"

def main():
    print("--- LOGIN ATTEMPT (user1@dairy.com) ---")
    try:
        # 1. Login
        payload = {"username": "user1@dairy.com", "password": "user123"} # Assuming password is user123 based on seed strategy or standard
        # If seed_data.py was used, passwords might be "password" or "user123". 
        # Checking seed_data.py content would be good, but I'll try "password" first if this fails, or check the seed script.
        # Actually, let's look at the seed script first or just try both.
        
        print(f"Attempting login with password 'password'...")
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": "user1@dairy.com", "password": "password"},
            timeout=5
        )
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
        
        if resp.status_code != 200:
             print(f"Attempting login with password 'user123'...")
             resp = requests.post(
                f"{BASE_URL}/auth/login",
                data={"username": "user1@dairy.com", "password": "user123"},
                timeout=5
            )
             print(f"Status: {resp.status_code}")
             print(f"Response: {resp.text}")

        if resp.status_code == 200:
            token = resp.json().get("access_token")
            print("Login Successful.")
            headers = {"Authorization": f"Bearer {token}"}
            
            # 2. Fetch Profile
            print("Fetching Profile...")
            resp = requests.get(f"{BASE_URL}/users/me", headers=headers, timeout=5)
            print(f"Profile Status: {resp.status_code}")
            print(f"Profile Body: {resp.text}")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    main()
