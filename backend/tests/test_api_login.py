import requests
import json

base_url = "http://localhost:8000/api/v1"
login_url = f"{base_url}/auth/login"

def test_api_login():
    payload = {
        "username": "admin@dairy.com",
        "password": "admin123"
    }

    try:
        response = requests.post(login_url, data=payload)
        
        if response.status_code == 200:
            print("✅ API Login Successful!")
            data = response.json()
            print(f"Token: {data.get('access_token')[:20]}...")
            print(f"User: {data.get('user', {}).get('email')}")
            # Check cookies
            if 'access_token' in response.cookies:
                 print("✅ Access token cookie SET")
            else:
                 print("❌ Access token cookie MISSING")
            
        else:
            print(f"❌ API Login FAILED: {response.status_code}")
            print(response.text)

    except Exception as e:
        print(f"❌ Error connecting to API: {e}")
        print("Make sure the backend is running on localhost:8000")

if __name__ == "__main__":
    test_api_login()
