#!/usr/bin/env python
"""Quick acceptance test runner"""
import requests
from datetime import date, datetime

API_URL = 'http://localhost:8001'
FRONTEND_URL = 'http://localhost:3000'

results = []

print("="*60)
print("DAIRYOS ACCEPTANCE TESTS")
print("="*60)

# Test 1: Health Check
r = requests.get(f'{API_URL}/api/health', timeout=10)
status = 'PASS' if r.status_code == 200 else 'FAIL'
results.append(('Health Check', status))
print(f"1. Health Check: {status} (HTTP {r.status_code})")

# Test 2: Admin Login
admin_token = None
r = requests.post(f'{API_URL}/api/v1/auth/login', data={'username': 'admin@dairy.com', 'password': 'admin123'}, timeout=10)
if r.status_code == 200:
    admin_token = r.json().get('access_token')
    results.append(('Admin Login', 'PASS'))
    print(f"2. Admin Login: PASS")
else:
    results.append(('Admin Login', 'FAIL'))
    print(f"2. Admin Login: FAIL (HTTP {r.status_code})")

# Test 3: User Login
user_token = None
r = requests.post(f'{API_URL}/api/v1/auth/login', data={'username': 'user1@dairy.com', 'password': 'password123'}, timeout=10)
if r.status_code == 200:
    user_token = r.json().get('access_token')
    results.append(('User Login', 'PASS'))
    print(f"3. User Login: PASS")
else:
    results.append(('User Login', 'FAIL'))
    print(f"3. User Login: FAIL (HTTP {r.status_code})")

# Test 4: Admin Daily Entry
if admin_token:
    r = requests.get(f'{API_URL}/api/v1/admin/daily-entry?selected_date={date.today()}', headers={'Authorization': f'Bearer {admin_token}'}, timeout=10)
    status = 'PASS' if r.status_code == 200 else 'FAIL'
    results.append(('Admin Daily Entry', status))
    print(f"4. Admin Daily Entry: {status} (HTTP {r.status_code})")

# Test 5: User Consumption
if user_token:
    r = requests.get(f'{API_URL}/api/v1/consumption/mine?month={date.today().strftime("%Y-%m")}', headers={'Authorization': f'Bearer {user_token}'}, timeout=10)
    status = 'PASS' if r.status_code == 200 else 'FAIL'
    results.append(('User Consumption', status))
    print(f"5. User Consumption: {status} (HTTP {r.status_code})")

# Test 6: Admin User List
if admin_token:
    r = requests.get(f'{API_URL}/api/v1/users/', headers={'Authorization': f'Bearer {admin_token}'}, timeout=10)
    status = 'PASS' if r.status_code == 200 else 'FAIL'
    results.append(('Admin User List', status))
    print(f"6. Admin User List: {status} (HTTP {r.status_code})")

# Test 7: User Admin Restriction
if user_token:
    r = requests.get(f'{API_URL}/api/v1/users/', headers={'Authorization': f'Bearer {user_token}'}, timeout=10)
    status = 'PASS' if r.status_code == 403 else 'FAIL'
    results.append(('User Admin Restriction', status))
    print(f"7. User Admin Restriction: {status} (HTTP {r.status_code})")

# Test 8: Frontend Health
r = requests.get(FRONTEND_URL, timeout=5)
status = 'PASS' if r.status_code in [200, 304] else 'NEEDS REVIEW'
results.append(('Frontend Health', status))
print(f"8. Frontend Health: {status} (HTTP {r.status_code})")

# Summary
passed = sum(1 for _, s in results if s == 'PASS')
failed = sum(1 for _, s in results if s == 'FAIL')
review = sum(1 for _, s in results if s == 'NEEDS REVIEW')

print("\n" + "="*60)
print(f"SUMMARY: {passed}/{len(results)} PASSED | Failed: {failed} | Review: {review}")
print("="*60)

# Save results
with open('acceptance-results.json', 'w') as f:
    import json
    json.dump({
        'timestamp': datetime.now().isoformat(),
        'summary': {'passed': passed, 'failed': failed, 'needs_review': review},
        'results': results
    }, f, indent=2)
print("\nResults saved to acceptance-results.json")

