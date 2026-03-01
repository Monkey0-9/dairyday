import requests
import datetime

import urllib3
urllib3.disable_warnings()

BASE_URL = "http://localhost:8000/api/v1"

def test_admin_edit():
    s = requests.Session()
    # Login
    resp = s.post(f"{BASE_URL}/auth/login", data={"username": "admin@dairy.com", "password": "admin123"})
    if resp.status_code != 200:
        print("Login failed:", resp.status_code, resp.text)
        return
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful")

    # Get users
    resp = s.get(f"{BASE_URL}/admin/daily-entry?selected_date=2026-02-01", headers=headers)
    if resp.status_code != 200:
        print("Get users failed:", resp.text)
        return
    users = resp.json()
    if not users:
        print("No users found")
        return
    target_user = users[0]["id"]
    print("Testing edit for user:", target_user)

    # Note: we need to test `admin upsert_consumption` via PATCH /consumption/
    date_val = "2026-02-01"  # Definitely older than LOCK_DAYS (assume today is 2026-02-28, diff is > 20 days, lock_days is usually < 10)
    
    # 1. Unlock the month
    print("Unlocking month 2026-02")
    resp = s.post(f"{BASE_URL}/admin/unlock?month=2026-02", headers=headers)
    print("Unlock response:", resp.status_code, resp.text)
    
    # 2. Edit
    print("Trying to edit")
    payload = {
        "user_id": target_user,
        "date": date_val,
        "quantity": 2.5,
        "extra_qty": 0.0,
        "status": "DELIVERED",
        "note": "Admin Test"
    }
    resp = s.patch(f"{BASE_URL}/consumption/", json=payload, headers=headers)
    print("Edit response:", resp.status_code, resp.text)

    # 3. Lock
    print("Locking month 2026-02")
    resp = s.post(f"{BASE_URL}/admin/lock?month=2026-02", headers=headers)
    print("Lock response:", resp.status_code, resp.text)
    
    # 4. Edit (should fail)
    print("Trying to edit while locked")
    payload["quantity"] = 3.0
    resp = s.patch(f"{BASE_URL}/consumption/", json=payload, headers=headers)
    print("Edit response (while locked):", resp.status_code, resp.text)

if __name__ == "__main__":
    test_admin_edit()
