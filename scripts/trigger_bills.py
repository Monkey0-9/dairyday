import requests
import sys

BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@dairy.com"
ADMIN_PASSWORD = "admin123"

def generate_bills():
    session = requests.Session()
    print("Logging in as admin...")
    resp = session.post(f"{BASE_URL}/api/v1/auth/login", data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Triggering bill generation for 2026-02...")
    resp = session.post(f"{BASE_URL}/api/v1/bills/generate-all", params={"month": "2026-02"}, headers=headers)
    print(f"Response: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    generate_bills()
