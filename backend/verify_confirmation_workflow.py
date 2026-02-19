import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1"

def test_workflow():
    # 1. Login as User
    login_data = {"username": "user@example.com", "password": "password123"}
    r = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    user_token = r.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 2. Login as Admin
    admin_data = {"username": "admin@example.com", "password": "password123"}
    r = requests.post(f"{BASE_URL}/auth/login", data=admin_data)
    admin_token = r.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. User requests a change for today
    today = time.strftime("%Y-%m-%d")
    request_data = {
        "date": today,
        "quantity": 2.5,
        "extra_qty": 1.0,
        "note": "Extra milk for guests"
    }
    print(f"User requesting change for {today}: {request_data}")
    r = requests.patch(f"{BASE_URL}/consumption/mine", json=request_data, headers=user_headers)
    print(f"Request Status: {r.status_code}")
    print(f"Response: {r.json()}")

    # 4. Admin lists pending requests
    print("\nAdmin listing pending requests...")
    r = requests.get(f"{BASE_URL}/consumption/requests", headers=admin_headers)
    pending = r.json()
    print(f"Total pending: {len(pending)}")
    
    target_request = None
    for req in pending:
        if req["date"] == today:
            target_request = req
            break
    
    if not target_request:
        print("Error: Request not found in pending list!")
        return

    print(f"Found request: {target_request['id']}")

    # 5. Admin approves the request
    print(f"\nAdmin approving request {target_request['id']}...")
    r = requests.post(f"{BASE_URL}/consumption/{target_request['id']}/verify?approved=true", headers=admin_headers)
    print(f"Approval Response: {r.json()}")

    # 6. Verify final quantity
    print("\nVerifying final quantity for user...")
    r = requests.get(f"{BASE_URL}/consumption/mine?month={today[:7]}", headers=user_headers)
    grid = r.json()
    
    confirmed = None
    for row in grid:
        if row["date"] == today:
            confirmed = row
            break
            
    if confirmed:
        print(f"Final Quantity: {confirmed['quantity']} (Expected: 2.5)")
        print(f"Final Extra Qty: {confirmed['extra_qty']} (Expected: 1.0)")
        print(f"Request Status: {confirmed.get('request_status')} (Expected: APPROVED)")
        
        if float(confirmed['quantity']) == 2.5 and float(confirmed['extra_qty']) == 1.0:
            print("\nSUCCESS: Workflow verified!")
        else:
            print("\nFAILURE: Quantity mismatch!")
    else:
        print("Error: Record not found in grid!")

if __name__ == "__main__":
    test_workflow()
