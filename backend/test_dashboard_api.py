import requests
import json

def test_dashboard_api():
    base_url = "http://localhost:8000/api/v1"
    
    # 1. Login to get token
    print("--- Attempting Login ---")
    login_res = requests.post(
        f"{base_url}/auth/login",
        data={"username": "admin@dairy.com", "password": "admin123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if login_res.status_code != 200:
        print(f"Login Failed: {login_res.status_code}")
        print(login_res.text)
        return

    token = login_res.json()["access_token"]
    print("Login Successful. Token obtained.")

    # 2. Fetch Dashboard Data
    print("\n--- Fetching Dashboard Analytics ---")
    headers = {"Authorization": f"Bearer {token}"}
    dash_res = requests.get(f"{base_url}/analytics/dashboard", headers=headers)
    
    print(f"Status Code: {dash_res.status_code}")
    try:
        data = dash_res.json()
        print("Response Data (KPIs):")
        # Just print the keys to see if they exist
        for key, val in data.items():
            if key != "revenue_trend":
                print(f"{key}: {val}")
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        print("Full Response Text:")
        print(dash_res.text)

if __name__ == "__main__":
    test_dashboard_api()
