"""Targeted API tests - print results directly."""
import requests
from datetime import date

BASE = "http://localhost:8000/api/v1"
today = date.today().isoformat()
month = date.today().strftime("%Y-%m")

# Login as admin
r = requests.post(f"{BASE}/auth/login", data={"username": "admin@dairy.com", "password": "admin123"}, timeout=10)
print(f"ADMIN LOGIN: {r.status_code}")
if r.status_code != 200:
    print(f"  FAIL: {r.text[:200]}")
    exit(1)

token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}"}

# Test each endpoint
tests = [
    ("GET", f"{BASE}/admin/daily-entry?selected_date={today}", "Daily Entry GET"),
    ("GET", f"{BASE}/analytics/dashboard", "Analytics Dashboard"),
    ("GET", f"{BASE}/users/", "Users List"),
    ("GET", f"{BASE}/users/me", "Current User"),
    ("GET", f"{BASE}/consumption/grid?month={month}", "Consumption Grid"),
    ("GET", f"{BASE}/consumption/requests", "Consumption Requests"),
    ("GET", f"{BASE}/bills/?month={month}", "Bills List"),
    ("GET", f"{BASE}/admin/payments?month={month}", "Admin Payments"),
    ("GET", f"{BASE}/registration/requests", "Registration Requests"),
    ("GET", f"{BASE}/support/admin", "Support Tickets"),
    ("GET", f"{BASE}/admin/audit-logs", "Audit Logs"),
]

print(f"\n--- ADMIN ENDPOINT RESULTS ---")
for method, url, name in tests:
    try:
        r = requests.request(method, url, headers=H, timeout=10)
        status = "PASS" if r.status_code < 400 else "FAIL"
        extra = ""
        if r.status_code < 400:
            try:
                data = r.json()
                if isinstance(data, list):
                    extra = f" ({len(data)} items)"
                elif isinstance(data, dict):
                    extra = f" (keys: {list(data.keys())[:4]})"
            except:
                extra = f" ({len(r.content)} bytes)"
        else:
            extra = f" => {r.text[:120]}"
        print(f"  [{status}] {name}: {r.status_code}{extra}")
    except Exception as e:
        print(f"  [ERR] {name}: {e}")

# Test Daily Entry POST (save)
print(f"\n--- DAILY ENTRY SAVE TEST ---")
r = requests.get(f"{BASE}/admin/daily-entry?selected_date={today}", headers=H, timeout=10)
if r.status_code == 200:
    entries = r.json()
    if entries:
        save_data = [{"user_id": entries[0]["id"], "liters": 2.5}]
        r2 = requests.post(f"{BASE}/admin/daily-entry?selected_date={today}", headers=H, json=save_data, timeout=10)
        print(f"  Save: {r2.status_code} - {r2.text[:200]}")
    else:
        print("  No entries to save!")

# Test Bills Generation
print(f"\n--- BILLS GENERATION TEST ---")
r = requests.post(f"{BASE}/bills/generate-all?month={month}", headers=H, timeout=10)
print(f"  Generate All: {r.status_code} - {r.text[:200]}")

# Customer Login
print(f"\n--- CUSTOMER LOGIN ---")
r = requests.post(f"{BASE}/auth/login", data={"username": "user1@dairy.com", "password": "password123"}, timeout=10)
print(f"Customer Login: {r.status_code}")
if r.status_code == 200:
    ct = r.json()["access_token"]
    CH = {"Authorization": f"Bearer {ct}"}
    
    ctests = [
        ("GET", f"{BASE}/consumption/mine?month={month}", "My Consumption"),
        ("GET", f"{BASE}/users/me", "My Profile"),
        ("GET", f"{BASE}/bills/my?month={month}", "My Bills"),
        ("GET", f"{BASE}/support/", "My Tickets"),
    ]
    
    print(f"\n--- CUSTOMER ENDPOINT RESULTS ---")
    for method, url, name in ctests:
        try:
            r = requests.request(method, url, headers=CH, timeout=10)
            status = "PASS" if r.status_code < 400 else "FAIL"
            extra = ""
            if r.status_code < 400:
                try:
                    data = r.json()
                    if isinstance(data, list):
                        extra = f" ({len(data)} items)"
                    elif isinstance(data, dict):
                        extra = f" (keys: {list(data.keys())[:4]})"
                except:
                    extra = f" ({len(r.content)} bytes)"
            else:
                extra = f" => {r.text[:120]}"
            print(f"  [{status}] {name}: {r.status_code}{extra}")
        except Exception as e:
            print(f"  [ERR] {name}: {e}")
else:
    print(f"  FAIL: {r.text[:200]}")

print(f"\nDONE")
