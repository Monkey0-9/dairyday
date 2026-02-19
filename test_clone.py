"""Test script to verify Clone History (getDailyEntry for yesterday)."""
import requests
from datetime import date, timedelta

BASE = "http://localhost:8000/api/v1"
today = date.today().isoformat()
yesterday = (date.today() - timedelta(days=1)).isoformat()

# 1. Login
r = requests.post(f"{BASE}/auth/login", data={"username": "admin@dairy.com", "password": "admin123"}, timeout=10)
print(f"Login: {r.status_code}")
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}"}

# 2. Check if yesterday has data
print(f"\n--- Checking Yesterday ({yesterday}) ---")
r_y = requests.get(f"{BASE}/admin/daily-entry?selected_date={yesterday}", headers=H, timeout=10)
print(f"GET yesterday: {r_y.status_code}")
if r_y.status_code == 200:
    data_y = r_y.json()
    print(f"Items found yesterday: {len(data_y)}")
    for item in data_y[:3]:
        print(f"  {item['name']}: {item['liters']}L")
else:
    print(f"FAIL: {r_y.text}")

# 3. Check if today has data
print(f"\n--- Checking Today ({today}) ---")
r_t = requests.get(f"{BASE}/admin/daily-entry?selected_date={today}", headers=H, timeout=10)
print(f"GET today: {r_t.status_code}")
if r_t.status_code == 200:
    data_t = r_t.json()
    print(f"Items found today: {len(data_t)}")
else:
    print(f"FAIL: {r_t.text}")

print("\n--- Summary ---")
if r_y.status_code == 200 and r_t.status_code == 200:
    print("API logic for both dates works.")
else:
    print("API logic failed for one or more dates.")
