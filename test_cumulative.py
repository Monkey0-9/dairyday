"""Comprehensive test for Clone History and Persistence."""
import requests
import time
from datetime import date, timedelta

BASE = "http://localhost:8000/api/v1"
today_str = date.today().isoformat()
yesterday_str = (date.today() - timedelta(days=1)).isoformat()

# 1. Login
r = requests.post(f"{BASE}/auth/login", data={"username": "admin@dairy.com", "password": "admin123"}, timeout=10)
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}"}

# 2. Setup yesterday's data (e.g. set all to 2.5L)
print(f"Setting up yesterday ({yesterday_str})...")
r_y = requests.get(f"{BASE}/admin/daily-entry?selected_date={yesterday_str}", headers=H, timeout=10)
users = r_y.json()
save_y = [{"user_id": u["id"], "liters": 2.5} for u in users]
r_save_y = requests.post(f"{BASE}/admin/daily-entry?selected_date={yesterday_str}", headers=H, json=save_y, timeout=10)
print(f"  Save yesterday: {r_save_y.status_code}")

# 3. Simulate Clone: Fetch yesterday, prepare today's save
print(f"Simulating Clone for today ({today_str})...")
r_fetch_y = requests.get(f"{BASE}/admin/daily-entry?selected_date={yesterday_str}", headers=H, timeout=10)
cloned_data = r_fetch_y.json()
save_t = [{"user_id": u["id"], "liters": u["liters"]} for u in cloned_data]

# 4. Save today's data
r_save_t = requests.post(f"{BASE}/admin/daily-entry?selected_date={today_str}", headers=H, json=save_t, timeout=10)
print(f"  Save today (cloned): {r_save_t.status_code}")

# 5. Verify today's data
r_verify_t = requests.get(f"{BASE}/admin/daily-entry?selected_date={today_str}", headers=H, timeout=10)
final_data = r_verify_t.json()
success = True
for u in final_data:
    if u["liters"] != 2.5:
        print(f"  MISMATCH: {u['name']} has {u['liters']}L, expected 2.5L")
        success = False
        break

if success:
    print("SUCCESS: Clone History and Persistence verified!")
else:
    print("FAIL: Verification failed.")
