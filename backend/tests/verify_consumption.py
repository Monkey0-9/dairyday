import requests
import json
import datetime
import os

BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:8000/api/v1")

def verify_consumption_api():
    print("Starting Consumption API Verification...")
    
    # 1. Login
    login_url = f"{BASE_URL}/auth/login"
    payload = {
        "username": os.environ.get("ADMIN_EMAIL", "admin@dairy.com"), 
        "password": os.environ.get("ADMIN_PASSWORD", "admin123")
    }
    
    try:
        response = requests.post(login_url, data=payload) 
        if response.status_code != 200:
            print(f"❌ Login failed: {response.text}")
            return

        data = response.json()
        token = data.get("access_token")
        auth_headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login Successful")

        # 1.5 Get User ID
        me_url = f"{BASE_URL}/users/me"
        r = requests.get(me_url, headers=auth_headers)
        if r.status_code != 200:
            print(f"❌ Get Me failed: {r.text}")
            return
        me_data = r.json()
        user_id = me_data["id"] 
        print(f"✅ User ID: {user_id}")
        
        # 2. Get Mine (Current Month)
        today = datetime.date.today()
        month_str = today.strftime("%Y-%m")
        mine_url = f"{BASE_URL}/consumption/mine?month={month_str}"
        
        r = requests.get(mine_url, headers=auth_headers)
        if r.status_code != 200:
            print(f"❌ Get Mine failed: {r.text}")
            return
        
        records = r.json()
        print(f"Fetched {len(records)} records for {month_str}")
        
        # 3. Update Mine (Tomorrow)
        tomorrow = today + datetime.timedelta(days=1)
        tomorrow_str = tomorrow.strftime("%Y-%m-%d")
        
        update_payload = {
            "user_id": user_id, 
            "date": tomorrow_str,
            "quantity": 0, 
            "extra_qty": 2.5,
            "status": "PENDING",
            "note": "Test extra milk"
        }
        
        print(f"Updating consumption for {tomorrow_str}...")
        update_url = f"{BASE_URL}/consumption/mine"
        r = requests.patch(update_url, json=update_payload, headers=auth_headers)
        if r.status_code != 200:
            print(f"❌ Update Mine failed: {r.text}")
            return
        
        print("✅ Update Successful")
        
        # 4. Verify Update
        r = requests.get(mine_url, headers=auth_headers)
        records = r.json()
        updated_record = next((r for r in records if r["date"] == tomorrow_str), None)
        
        if updated_record:
            print(f"Record found: {updated_record}")
            if float(updated_record["extra_qty"]) == 2.5 and updated_record["note"] == "Test extra milk":
                print("✅ Verification Successful: Extra Quantity matched.")
            else:
                print("❌ Verification Failed: Data mismatch.")
        else:
            print("❌ Verification Failed: Record not found.")
            
        # Cleanup (Optional: Reset to 0)
        # ...

    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    verify_consumption_api()
