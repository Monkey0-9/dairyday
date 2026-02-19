import requests
import sys
import uuid
import datetime
import random

BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@dairy.com"
ADMIN_PASSWORD = "admin123"

class DairyTestClient:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None

    def login(self, username, password):
        resp = self.session.post(
            f"{BASE_URL}/api/v1/auth/login",
            data={"username": username, "password": password}
        )
        if resp.status_code == 200:
            self.access_token = resp.json().get("access_token")
            return True
        return False

    def request(self, method, path, **kwargs):
        headers = kwargs.get("headers", {})
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        kwargs["headers"] = headers
        return self.session.request(method, f"{BASE_URL}{path}", **kwargs)

def run_verification():
    print("Starting Clean Verification Flow...")
    
    admin = DairyTestClient()
    if not admin.login(ADMIN_EMAIL, ADMIN_PASSWORD):
        print("FAIL: Admin Login")
        return False
    
    # 1. Create a unique test user
    test_id = str(uuid.uuid4())[:8]
    user_email = f"test_{test_id}@example.com"
    user_password = "Password123"
    
    print(f"Creating test user {user_email}...")
    user_data = {
        "name": f"Test User {test_id}",
        "email": user_email,
        "password": user_password,
        "role": "USER",
        "price_per_liter": 60.0,
        "is_active": True
    }
    resp = admin.request("POST", "/api/v1/users/", json=user_data)
    if resp.status_code != 200:
        print(f"FAIL: Create User - {resp.status_code} {resp.text}")
        return False
    user_id = resp.json().get("id")
    print(f"PASS: Created User ID {user_id}")

    # 2. Seed consumption for the user (January 2026)
    print("Seeding consumption for Jan 2026...")
    for day in range(1, 11):
        date_str = f"2026-01-{day:02d}"
        consumption_data = {
            "user_id": user_id,
            "date": date_str,
            "quantity": 2.0
        }
        # In this API, consumption might be a PATCH to upsert
        resp = admin.request("PATCH", "/api/v1/consumption/", json=consumption_data)
        if resp.status_code != 200:
            print(f"FAIL: Seed Consumption - {resp.status_code} {resp.text}")
            return False
    print("PASS: Seeded Consumption")

    # 3. Generate Bill for Jan 2026
    print("Generating bill for Jan 2026...")
    resp = admin.request("POST", f"/api/v1/bills/generate/{user_id}/2026-01")
    if resp.status_code != 200:
        print(f"FAIL: Generate Bill - {resp.status_code} {resp.text}")
        return False
    bill_id = resp.json().get("id")
    print(f"PASS: Generated Bill ID {bill_id}")

    # 4. User Login
    user = DairyTestClient()
    print(f"Logging in as {user_email}...")
    if not user.login(user_email, user_password):
        print("FAIL: User Login")
        return False
    print("PASS: User Login")

    # 5. User Create Payment Order
    print("Creating payment order...")
    resp = user.request("POST", f"/api/v1/payments/create-order/{bill_id}")
    # Note: This might fail 500 if Razorpay keys are invalid, but we check if logic reaches there
    if resp.status_code == 200:
        print("PASS: Payment Order Created")
    elif resp.status_code == 500 and "Razorpay Error" in resp.text:
        print("PASS (Expected): Logic reached Razorpay integration")
    else:
        print(f"FAIL: Create Order - {resp.status_code} {resp.text}")
        return False

    # 6. Admin Mark Paid
    print("Admin marking bill as paid...")
    resp = admin.request("POST", f"/api/v1/payments/mark-paid/{bill_id}")
    if resp.status_code != 200:
        print(f"FAIL: Mark Paid - {resp.status_code} {resp.text}")
        return False
    print("PASS: Marked as Paid")

    # 7. Final Verification
    print("Verifying bill status...")
    resp = user.request("GET", "/api/v1/bills/", params={"month": "2026-01"})
    if resp.status_code != 200:
        print(f"FAIL: Get Bills - {resp.status_code}")
        return False
    
    bills = resp.json()
    verified_bill = next((b for b in bills if b.get("id") == bill_id), None)
    if not verified_bill or verified_bill.get("status") != "PAID":
        print(f"FAIL: Bill status is {verified_bill.get('status') if verified_bill else 'Missing'}")
        return False
    print("PASS: Bill status is PAID")

    print("\n" + "="*40)
    print("END-TO-END VERIFICATION SUCCESSFUL")
    print("="*40)
    return True

if __name__ == "__main__":
    if not run_verification():
        sys.exit(1)
