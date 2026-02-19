"""
Comprehensive API endpoint testing for DairyDay.
Tests all admin and customer endpoints.
"""
import requests
import json
from datetime import date, datetime

BASE = "http://localhost:8000/api/v1"

def login(email, password):
    r = requests.post(f"{BASE}/auth/login", data={"username": email, "password": password})
    if r.status_code == 200:
        data = r.json()
        print(f"  LOGIN OK: role={data.get('role')}, user_id={data.get('user_id')}")
        return data.get("access_token"), data.get("user_id"), data.get("role")
    else:
        print(f"  LOGIN FAILED ({email}): {r.status_code} - {r.text[:200]}")
        return None, None, None

def test_endpoint(name, method, url, token, json_data=None, params=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        if method == "GET":
            r = requests.get(url, headers=headers, params=params)
        elif method == "POST":
            r = requests.post(url, headers=headers, json=json_data, params=params)
        elif method == "PATCH":
            r = requests.patch(url, headers=headers, json=json_data)
        else:
            r = requests.request(method, url, headers=headers, json=json_data)
        
        status = "OK" if r.status_code < 400 else "FAIL"
        detail = ""
        if r.status_code < 400:
            try:
                data = r.json()
                if isinstance(data, list):
                    detail = f"returned {len(data)} items"
                elif isinstance(data, dict):
                    keys = list(data.keys())[:5]
                    detail = f"keys={keys}"
            except:
                detail = f"non-json response, {len(r.content)} bytes"
        else:
            detail = r.text[:200]
        
        print(f"  [{status}] {name}: {r.status_code} - {detail}")
        return r.status_code, r
    except Exception as e:
        print(f"  [ERROR] {name}: {e}")
        return 0, None

def main():
    today = date.today().isoformat()
    month = date.today().strftime("%Y-%m")
    
    print("=" * 70)
    print("DAIRYDAY COMPREHENSIVE API TEST")  
    print(f"Date: {datetime.now().isoformat()}")
    print(f"Testing date: {today}, month: {month}")
    print("=" * 70)
    
    # ==================== ADMIN TESTS ====================
    print("\n--- ADMIN LOGIN ---")
    admin_token, admin_id, admin_role = login("admin@dairy.com", "admin123")
    if not admin_token:
        # Try alternate emails
        admin_token, admin_id, admin_role = login("admin@dairyday.com", "admin123")
    if not admin_token:
        print("CRITICAL: Admin login failed with both emails. Cannot proceed.")
        # Try to find what's in the db
        print("\nTrying to hit root endpoint...")
        try:
            r = requests.get("http://localhost:8000/")
            print(f"  Root: {r.status_code} - {r.text[:200]}")
        except Exception as e:
            print(f"  Root failed: {e}")
        return
    
    print(f"\n--- ADMIN ENDPOINTS (role={admin_role}) ---")
    
    # Daily Entry
    print("\n[Daily Entry - TODAY]")
    code, resp = test_endpoint("GET daily-entry (today)", "GET", f"{BASE}/admin/daily-entry", admin_token, params={"selected_date": today})
    entries_data = []
    if code == 200:
        entries_data = resp.json()
        if entries_data:
            print(f"    -> {len(entries_data)} users found")
            for e in entries_data[:3]:
                print(f"       {e.get('name')}: {e.get('liters')}L (locked={e.get('is_locked')})")
            
            # Try saving the first entry back (unchanged - should work)
            test_data = [{"user_id": entries_data[0]["id"], "liters": entries_data[0]["liters"]}]
            test_endpoint("POST daily-entry (save)", "POST", f"{BASE}/admin/daily-entry", admin_token, json_data=test_data, params={"selected_date": today})
        else:
            print("    -> WARNING: No active users in daily entry!")
    
    # Dashboard/Analytics
    print("\n[Analytics]")
    test_endpoint("GET analytics dashboard", "GET", f"{BASE}/analytics/dashboard", admin_token)
    
    # Users/Customers
    print("\n[Users/Customers]")
    code, resp = test_endpoint("GET users list", "GET", f"{BASE}/users/", admin_token)
    users_list = []
    if code == 200:
        users_list = resp.json()
        print(f"    -> {len(users_list)} users in database")
    
    test_endpoint("GET my profile", "GET", f"{BASE}/users/me", admin_token)
    
    # Consumption  
    print("\n[Consumption]")
    test_endpoint("GET consumption grid", "GET", f"{BASE}/consumption/grid", admin_token, params={"month": month})
    test_endpoint("GET consumption requests", "GET", f"{BASE}/consumption/requests", admin_token)
    
    # Bills
    print("\n[Bills]")
    test_endpoint("GET bills list", "GET", f"{BASE}/bills/", admin_token, params={"month": month})
    test_endpoint("POST generate-all bills", "POST", f"{BASE}/bills/generate-all", admin_token, params={"month": month})
    
    # Admin Payments
    print("\n[Admin Payments]")
    test_endpoint("GET payments dashboard", "GET", f"{BASE}/admin/payments", admin_token, params={"month": month})
    
    # Registrations
    print("\n[Registrations]")
    test_endpoint("GET registration requests", "GET", f"{BASE}/registration/requests", admin_token)
    
    # Support
    print("\n[Support]")
    test_endpoint("GET support tickets", "GET", f"{BASE}/support/admin", admin_token)
    
    # Audit
    print("\n[Audit]")
    test_endpoint("GET audit logs", "GET", f"{BASE}/admin/audit-logs", admin_token)
    
    
    # ==================== CUSTOMER TESTS ====================
    print("\n\n" + "=" * 70)
    print("CUSTOMER ENDPOINT TESTS")
    print("=" * 70)
    
    # Try logging in with test user
    customer_token = None
    customer_id = None
    
    for i in range(1, 11):
        email = f"user{i}@dairy.com"
        customer_token, customer_id, _ = login(email, "password123")
        if customer_token:
            break
    
    if not customer_token:
        print("  Could not login as any customer. Skipping customer tests.")
    else:
        print(f"\n--- CUSTOMER ENDPOINTS (user_id={customer_id}) ---")
        
        # Customer Dashboard Data
        print("\n[Customer Dashboard]")
        test_endpoint("GET my consumption", "GET", f"{BASE}/consumption/mine", customer_token, params={"month": month})
        test_endpoint("GET my profile", "GET", f"{BASE}/users/me", customer_token)
        
        # Customer Bill
        print("\n[Customer Bill]")
        test_endpoint("GET my bills", "GET", f"{BASE}/bills/my", customer_token, params={"month": month})
        
        # Customer Support
        print("\n[Customer Support]")
        test_endpoint("GET my tickets", "GET", f"{BASE}/support/", customer_token)
        
        # Customer - request modification
        print("\n[Customer Modification Request]")
        test_endpoint("POST modification request", "POST", f"{BASE}/consumption/request", customer_token, json_data={
            "date": today,
            "requested_quantity": 2.0,
            "modification_type": "REGULAR"
        })
    
    print("\n" + "=" * 70)
    print("TEST COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    main()
