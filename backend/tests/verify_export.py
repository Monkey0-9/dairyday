import requests
import sys
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def login(email, password):
    response = requests.post(f"{BASE_URL}/auth/login/access-token", data={"username": email, "password": password})
    if response.status_code != 200:
        print(f"Login failed for {email}: {response.text}")
        sys.exit(1)
    return response.json()["access_token"]

def test_export():
    # 1. Login as Admin
    print("Logging in as Admin...")
    admin_token = login("admin@dairy.com", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Test Admin Export (JSON)
    print("Testing Admin Export (JSON)...")
    response = requests.get(f"{BASE_URL}/consumption/export?month=2026-01&format=json", headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(f"Admin Export Success. Rows: {len(data)}")
        if len(data) > 0:
            print("Sample Row:", data[0])
    else:
        print(f"Admin Export Failed: {response.text}")

    # 3. Test Admin Export (CSV)
    print("Testing Admin Export (CSV)...")
    response = requests.get(f"{BASE_URL}/consumption/export?month=2026-01&format=csv", headers=headers)
    if response.status_code == 200:
        print(f"Admin Export CSV Success. Content Length: {len(response.content)}")
    else:
         print(f"Admin Export CSV Failed: {response.text}")

if __name__ == "__main__":
    test_export()
