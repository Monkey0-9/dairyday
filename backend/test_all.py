import urllib.request
import urllib.error
import urllib.parse
import json
import uuid
import datetime

BASE_URL = "http://127.0.0.1:8000/api/v1"

def print_result(name, url, method, expected_status=200, res_code=None, error=None):
    if res_code == expected_status:
        print(f"PASS {name}: OK ({res_code})")
        return True
    else:
        print(f"FAIL {name}: FAILED (Expected {expected_status}, Got {res_code}, Error: {error})")
        return False

def make_request(method, url, data=None, token=None):
    req_url = f"{BASE_URL}{url}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    if data:
        if isinstance(data, dict) and not "application/x-www-form-urlencoded" in headers.get("Content-Type", ""):
            data = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif isinstance(data, dict):
            data = urllib.parse.urlencode(data).encode("utf-8")
            
    req = urllib.request.Request(req_url, data=data, headers=headers, method=method)
    
    try:
        response = urllib.request.urlopen(req)
        body = response.read().decode("utf-8")
        try:
            body = json.loads(body)
        except json.JSONDecodeError:
            pass
        return response.getcode(), body, None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            body = json.loads(body)
        except json.JSONDecodeError:
            pass
        return e.code, body, f"HTTPError {e.code}"
    except Exception as e:
        return None, None, str(e)

def format_date_range():
    today = datetime.date.today()
    return today.strftime("%Y-%m")

def test_everything():
    print("Starting End-to-End API Verification...\n")
    month_str = format_date_range()
    
    # 1. Admin Auth
    data = urllib.parse.urlencode({"username": "admin@dairy.com", "password": "admin123"}).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/auth/login", data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        response = urllib.request.urlopen(req)
        res_data = json.loads(response.read().decode("utf-8"))
        admin_token = res_data["access_token"]
        print_result("Admin Login", "/auth/login", "POST", 200, response.getcode())
    except Exception as e:
        print(f"❌ Admin Login failed: {e}")
        return

    # 2. Customer Auth
    data = urllib.parse.urlencode({"username": "prakashpraveen239@gmail.com", "password": "test12345"}).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/auth/login", data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        response = urllib.request.urlopen(req)
        res_data = json.loads(response.read().decode("utf-8"))
        customer_token = res_data["access_token"]
        print_result("Customer Login", "/auth/login", "POST", 200, response.getcode())
    except Exception as e:
        print(f"❌ Customer Login failed: {e}")
        return
        
    print("\n--- Testing Admin Endpoints ---")
    
    endpoints = [
        ("Admin Dashboard Stats", "/analytics/dashboard", "GET"),
        ("Admin Users List", "/users/?skip=0&limit=100", "GET"),
        ("Admin Consumption Grid", f"/consumption/grid?month={month_str}", "GET"),
        ("Admin Pending Requests", "/consumption/requests", "GET"),
        ("Admin Bills Generator", f"/bills/generate-all?month={month_str}", "POST"), 
        ("Admin Payments List", f"/admin/payments?month={month_str}", "GET")
    ]
    
    for name, url, method in endpoints:
        code, body, error = make_request(method, url, token=admin_token)
        print_result(name, url, method, 200, code, error)
        
    print("\n--- Testing Customer Endpoints ---")
    
    code, body, error = make_request("GET", "/users/me", token=customer_token)
    print_result("Customer Profile", "/users/me", "GET", 200, code, error)
    user_id = body.get("id") if body else None
    
    customer_endpoints = [
        ("Customer Consumption", f"/consumption/mine?month={month_str}", "GET"),
    ]
    
    if user_id:
        customer_endpoints.append(("Customer Bill", f"/bills/{user_id}/{month_str}", "GET"))
        customer_endpoints.append(("Customer Payments", "/payments/last", "GET"))
    
    for name, url, method in customer_endpoints:
        code, _, error = make_request(method, url, token=customer_token)
        print_result(name, url, method, 200, code, error)

    print("\nAPI Verification Complete!")

if __name__ == "__main__":
    test_everything()
