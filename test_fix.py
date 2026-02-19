"""Verify the db.add fix by saving a new daily entry and checking persistence."""
import requests
import time

BASE = "http://localhost:8000/api/v1"

# Wait for backend reload
time.sleep(3)

# Login
r = requests.post(f"{BASE}/auth/login", data={"username": "admin@dairy.com", "password": "admin123"}, timeout=10)
print(f"Login: {r.status_code}")
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}"}

# Use a future date that definitely has no existing records
test_date = "2026-02-19"

# Get daily entry for tomorrow (should show defaults)
r = requests.get(f"{BASE}/admin/daily-entry?selected_date={test_date}", headers=H, timeout=10)
print(f"GET (before save): {r.status_code}, entries={len(r.json())}")
entries = r.json()
if entries:
    first = entries[0]
    print(f"  First entry: {first['name']}, liters={first['liters']}")

    # Save an entry with 3.5 liters
    save_data = [{"user_id": first["id"], "liters": 3.5}]
    r2 = requests.post(f"{BASE}/admin/daily-entry?selected_date={test_date}", headers=H, json=save_data, timeout=10)
    print(f"POST save: {r2.status_code} - {r2.text[:150]}")

    # Now re-fetch to verify the data persisted
    r3 = requests.get(f"{BASE}/admin/daily-entry?selected_date={test_date}", headers=H, timeout=10)
    entries2 = r3.json()
    saved_entry = [e for e in entries2 if e["id"] == first["id"]][0]
    print(f"GET (after save): liters={saved_entry['liters']}")
    if saved_entry["liters"] == 3.5:
        print("SUCCESS: Data persisted correctly!")
    else:
        print(f"FAIL: Expected 3.5, got {saved_entry['liters']}")
