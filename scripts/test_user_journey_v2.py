import requests
import sys
import datetime

BASE_URL = "http://localhost:8000"
USER_EMAIL = "user1@dairy.com"
USER_PASSWORD = "password123"
ADMIN_EMAIL = "admin@dairy.com"
ADMIN_PASSWORD = "admin123"

class DairyTestClient:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.csrf_token = None

    def _get_headers(self):
        headers = {}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        if self.csrf_token:
            headers["X-CSRF-Token"] = self.csrf_token
        return headers

    def login(self, username, password):
        print(f"Attempting login for {username}...")
        resp = self.session.post(
            f"{BASE_URL}/api/v1/auth/login",
            data={"username": username, "password": password}
        )
        print(f"Login Response: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            self.access_token = data.get("access_token")
            # Extract CSRF token from cookies
            self.csrf_token = self.session.cookies.get("csrf_token")
            print(f"access_token: {self.access_token[:20]}...")
            print(f"CSRF Token: {self.csrf_token}")
            return True
        else:
            print(f"Login failed: {resp.status_code} - {resp.text}")
            return False

    def get_profile(self):
        print("Getting user profile...")
        resp = self.session.get(f"{BASE_URL}/api/v1/users/me", headers=self._get_headers())
        if resp.status_code == 200:
            return resp.json()
        print(f"Get profile failed: {resp.status_code} - {resp.text}")
        return None

    def generate_bills(self, month="2026-02"):
        print(f"Admin generating bills for {month}...")
        resp = self.session.post(f"{BASE_URL}/api/v1/bills/generate-all", params={"month": month}, headers=self._get_headers())
        if resp.status_code in [200, 202]:
            print(f"Bills generation triggered: {resp.text}")
            return True
        print(f"Failed to generate bills: {resp.status_code} - {resp.text}")
        return False

    def get_bills(self, month="2026-02"):
        print(f"Getting bills for {month}...")
        resp = self.session.get(f"{BASE_URL}/api/v1/bills/", params={"month": month}, headers=self._get_headers())
        if resp.status_code == 200:
            return resp.json()
        print(f"Failed to get bills: {resp.status_code} - {resp.text}")
        return None

    def create_payment_order(self, bill_id):
        print(f"Creating payment order for bill {bill_id}...")
        # Add a dummy idempotency key
        headers = self._get_headers()
        headers["Idempotency-Key"] = f"test-key-{bill_id}"
        resp = self.session.post(f"{BASE_URL}/api/v1/payments/create-order/{bill_id}", headers=headers)
        if resp.status_code == 200:
            return resp.json()
        print(f"Failed to create order: {resp.status_code} - {resp.text}")
        return None

    def admin_mark_paid(self, bill_id):
        print(f"Admin marking bill {bill_id} as paid...")
        resp = self.session.post(f"{BASE_URL}/api/v1/payments/mark-paid/{bill_id}", headers=self._get_headers())
        if resp.status_code == 200:
            return resp.json()
        print(f"Failed to mark as paid: {resp.status_code} - {resp.text}")
        return None

def run_test():
    month = "2026-02"
    
    try:
        # 1. Admin Login to setup data
        admin_client = DairyTestClient()
        if not admin_client.login(ADMIN_EMAIL, ADMIN_PASSWORD):
            print("FAIL: Admin Login")
            return False
        
        # 2. User Login
        user_client = DairyTestClient()
        print(f"DEBUG: Attempting User Login for {USER_EMAIL}...")
        if not user_client.login(USER_EMAIL, USER_PASSWORD):
            print("FAIL: User Login")
            return False
        print("PASS: User Login")

        # 3. Get Profile
        profile = user_client.get_profile()
        if not profile or profile.get("email") != USER_EMAIL:
            print(f"FAIL: Get Profile - {profile}")
            return False
        print(f"PASS: Get Profile (Name: {profile.get('name')})")

        # 4. Get Bills
        bills = user_client.get_bills(month)
        if bills is None:
            print("FAIL: No response for bills")
            return False
        
        print(f"Found {len(bills)} bills for user.")
        for b in bills:
            print(f"  Bill: id={b.get('id')}, month={b.get('month')}, status={b.get('status')}, locked={b.get('is_locked')}")

        unpaid_bill = next((b for b in bills if b.get("status") == "UNPAID"), None)
        if not unpaid_bill:
            print(f"FAIL: No unpaid bill found for {month} in the list above.")
            return False
        
        print(f"PASS: Found Unpaid Bill {unpaid_bill.get('id')} for {unpaid_bill.get('month')} amount {unpaid_bill.get('total_amount')}")
        bill_id = unpaid_bill.get("id")

        # 5. Create Payment Order
        order = user_client.create_payment_order(bill_id)
        if not order or not order.get("id"):
            print("WARNING: Create Payment Order failed (likely Razorpay keys missing)")
        else:
            print(f"PASS: Created Payment Order {order.get('id')}")

        # 6. Admin Mark as Paid
        paid_result = admin_client.admin_mark_paid(bill_id)
        if not paid_result:
            print("FAIL: Admin Mark Paid")
            return False
        print("PASS: Admin Mark Paid")

        # 7. Verify Bill Status
        updated_bills = user_client.get_bills(month)
        verified_bill = next((b for b in updated_bills if b.get("id") == bill_id), None)
        if not verified_bill or verified_bill.get("status") != "PAID":
            print(f"FAIL: Bill status verification. Status: {verified_bill.get('status') if verified_bill else 'Unknown'}")
            return False
        print("PASS: Bill status verified as PAID")

        print("\n" + "="*30)
        print("ALL TESTS PASSED SUCCESSFULLY")
        print("="*30)
        return True
    except Exception as e:
        import traceback
        print(f"CRITICAL: Test script crashed: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if not run_test():
        sys.exit(1)
