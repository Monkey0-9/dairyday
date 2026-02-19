import requests
import sys
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000/api/v1"

def login(email, password):
    response = requests.post(
        f"{BASE_URL}/auth/login/access-token", 
        data={"username": email, "password": password},
        timeout=10
    )
    if response.status_code != 200:
        print(f"Login failed for {email}: {response.text}")
        sys.exit(1)
    return response.json()["access_token"]

def test_cancellation_flow():
    # 1. Login as User
    print("Step 1: Logging in as User...")
    user_email = "e2e_test@dairy.com"
    user_password = "password123"  # Standard test password
    
    # Try to login, if fails, we might need to create the user (optional setup)
    try:
        user_token = login(user_email, user_password)
    except:
        print("User login failed. Ensure test user exists.")
        return

    headers_user = {"Authorization": f"Bearer {user_token}"}
    
    # Get Current User Info
    me_res = requests.get(f"{BASE_URL}/users/me", headers=headers_user)
    user_id = me_res.json()["id"]
    print(f"Logged in as User: {user_id}")

    # 2. Cancel a future date (e.g., tomorrow)
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    month_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m")
    print(f"Step 2: Cancelling delivery for {tomorrow}...")
    
    cancel_payload = {
        "date": tomorrow,
        "quantity": 0,
        "status": "SKIPPED"
    }
    res = requests.patch(f"{BASE_URL}/consumption/", json=cancel_payload, headers=headers_user)
    if res.status_code != 200:
        print(f"Cancellation failed: {res.text}")
        return
    print("Cancellation successful.")

    # 3. Login as Admin
    print("Step 3: Logging in as Admin...")
    admin_token = login("admin@dairy.com", "admin123")
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # 4. Verify cancellation in Admin view
    print("Step 4: Verifying cancellation in Admin view...")
    # Admin gets consumption grid/list
    res = requests.get(f"{BASE_URL}/consumption/export?month={month_str}&format=json", headers=headers_admin)
    data = res.json()
    
    found = False
    for row in data:
        if row["Email"] == user_email:
            day_num = str(int(tomorrow.split("-")[2]))
            qty = row.get(day_num)
            print(f"Admin view - User: {user_email}, Date: {tomorrow}, Quantity: {qty}")
            if float(qty) == 0.0:
                print("SUCCESS: Admin sees the cancellation (0.0 qty).")
                found = True
            break
    
    if not found:
        print("FAILURE: Could not verify cancellation in admin view.")

    # 5. Check if it reflects in the bill (Draft bill or actual bill)
    print("Step 5: Verifying Draft Bill calculation...")
    # Trigger bill calculation for the user
    res = requests.get(f"{BASE_URL}/bills/{user_id}/{month_str}", headers=headers_admin)
    if res.status_code == 200:
        bill_data = res.json()
        print(f"Bill for {month_str}: Total Amount = {bill_data.get('total_amount')}")
        # Ideally we'd compare this against an expected sum, but for now we just check if it's reachable.
    else:
        print(f"Bill check failed or bill not yet generated: {res.text}")

if __name__ == "__main__":
    test_cancellation_flow()
