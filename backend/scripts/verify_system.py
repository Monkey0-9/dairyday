import requests
import json
import sys
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8001/api/v1"
ADMIN_EMAIL = "admin@dairy.com"
ADMIN_PASS = "admin123"
USER_EMAIL = "user1@dairy.com"
USER_PASS = "password123"

class Color:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def log(msg, type="info"):
    if type == "success":
        print(f"{Color.GREEN}✅ {msg}{Color.RESET}")
    elif type == "error":
        print(f"{Color.RED}❌ {msg}{Color.RESET}")
    elif type == "warn":
        print(f"{Color.YELLOW}⚠️ {msg}{Color.RESET}")
    else:
        print(f"{Color.BOLD}ℹ️ {msg}{Color.RESET}")

def test_system():
    print(f"{Color.BOLD}=== 🚀 STARTING COMPREHENSIVE SYSTEM VERIFICATION ==={Color.RESET}\n")
    
    # ---------------------------------------------------------
    # 1. AUTHENTICATION
    # ---------------------------------------------------------
    log("Testing Authentication...", "info")
    
    # Admin Login
    admin_token = None
    try:
        res = requests.post(f"{BASE_URL}/auth/login", data={"username": ADMIN_EMAIL, "password": ADMIN_PASS})
        if res.status_code == 200:
            admin_token = res.json()["access_token"]
            log("Admin Login Successful", "success")
        else:
            log(f"Admin Login Failed: {res.text}", "error")
    except Exception as e:
        log(f"Backend Offline or Error: {e}", "error")
        return

    # User Login
    user_token = None
    try:
        res = requests.post(f"{BASE_URL}/auth/login", data={"username": USER_EMAIL, "password": USER_PASS})
        if res.status_code == 200:
            user_token = res.json()["access_token"]
            log("User Login Successful", "success")
        else:
            log(f"User Login Failed: {res.text}", "error")
    except Exception as e:
        log(f"User Login Exception: {e}", "error")

    if not user_token:
        log("Cannot proceed without User Token", "error")
        return

    user_headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    # ---------------------------------------------------------
    # 2. PROFILE MANAGEMENT
    # ---------------------------------------------------------
    print()
    log("Testing Profile Management...", "info")
    
    # Get Profile
    user_id = None
    res = requests.get(f"{BASE_URL}/users/me", headers=user_headers)
    if res.status_code == 200:
        data = res.json()
        user_id = data["id"]
        log(f"Fetched Profile: {data['email']} (Active: {data['is_active']})", "success")
    else:
        log(f"Fetch Profile Failed: {res.status_code} {res.text}", "error")

    # Update Profile
    update_payload = {"name": f"Verified User {datetime.now().strftime('%H:%M')}"}
    res = requests.patch(f"{BASE_URL}/users/me", json=update_payload, headers=user_headers)
    if res.status_code == 200:
        log("Updated Profile Name", "success")
    else:
        log(f"Update Profile Failed: {res.status_code} {res.text}", "error")

    # ---------------------------------------------------------
    # 3. CONSUMPTION & CALENDAR
    # ---------------------------------------------------------
    print()
    log("Testing Consumption Logic...", "info")
    
    # Get Monthly Records
    current_month = datetime.now().strftime("%Y-%m")
    res = requests.get(f"{BASE_URL}/consumption/mine?month={current_month}", headers=user_headers)
    if res.status_code == 200:
        records = res.json()
        count = len(records) if isinstance(records, list) else len(records.get('data', []))
        log(f"Fetched {count} records for {current_month}", "success")
    else:
        log(f"Fetch Consumption Failed: {res.status_code}", "error")

    # Test "Today/Tomorrow" Rule
    today = datetime.now().date()
    tomorrow = today + timedelta(days=1)
    future = today + timedelta(days=5)
    
    # Update Tomorrow (Should Succeed)
    payload_tomorrow = {
        "date": tomorrow.strftime("%Y-%m-%d"),
        "quantity": 2.5,
        "status": "PENDING",
        "extra_qty": 0.0,
        "note": "Verification Test"
    }
    # sending note/extra_qty as per schema if needed, though optional usually.
    # The endpoint expects MyConsumptionRequest.
    
    res = requests.patch(f"{BASE_URL}/consumption/mine", json=payload_tomorrow, headers=user_headers)
    if res.status_code == 200:
        log("Update Tomorrow's Milk (Allowed) -> SUCCESS", "success")
    else:
        log(f"Update Tomorrow Failed: {res.status_code} {res.text}", "error")

    # Update Future Date (Should Fail)
    payload_future = {
        "date": future.strftime("%Y-%m-%d"),
        "quantity": 3.0,
        "status": "PENDING",
        "extra_qty": 0.0,
        "note": "Future Test"
    }
    res = requests.patch(f"{BASE_URL}/consumption/mine", json=payload_future, headers=user_headers)
    if res.status_code == 400 or res.status_code == 403:
        log(f"Update Future Date (Restricted) -> SUCCESS (Got {res.status_code})", "success")
    elif res.status_code == 200:
        log("⚠️ Update Future Date Succeeded (Warning: Strict Rule might be loose)", "warn")
    else:
        log(f"Update Future Date returned unexpected: {res.status_code} {res.text}", "error")

    # ---------------------------------------------------------
    # 4. ADMIN FEATURES
    # ---------------------------------------------------------
    print()
    if admin_token:
        log("Testing Admin Features...", "info")
        
        # Get All Users
        res = requests.get(f"{BASE_URL}/users/", headers=admin_headers)
        if res.status_code == 200:
            users = res.json()
            log(f"Admin fetched {len(users)} users", "success")
            
            # Find our test user
            target = next((u for u in users if u["email"] == USER_EMAIL), None)
            if target:
                log(f"Found user {USER_EMAIL} in admin list", "success")
        else:
            log(f"Admin Fetch Users Failed: {res.status_code}", "error")
            
        # Get System Stats (if endpoint exists - assuming /admin/stats or similar, checking users count is a proxy)
    else:
        log("Skipping Admin Tests (No Token)", "warn")

    print(f"\n{Color.BOLD}=== 🏁 VERIFICATION COMPLETE ==={Color.RESET}")

if __name__ == "__main__":
    test_system()
