import requests
import json

def verify_login_api():
    url = "http://localhost:8000/api/v1/auth/login"
    payload = {
        "username": "admin@dairy.com",
        "password": "admin123"
    }
    headers = {
        "Origin": "http://localhost:5173",
        "Content-Type": "application/json"
    }
    
    print(f"Testing login at {url}...")
    try:
        response = requests.post(url, json=payload, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"CORS Headers: {response.headers.get('Access-Control-Allow-Origin')}")
        print(f"Allow Credentials: {response.headers.get('Access-Control-Allow-Credentials')}")
        
        if response.status_code == 200:
            print("✅ Login Successful!")
            data = response.json()
            if "access_token" in data:
                print("✅ Token received.")
            else:
                print("❌ Token MISSING in response.")
        else:
            print(f"❌ Login Failed: {response.text}")
            
        # Verify CORS
        cors_header = response.headers.get('Access-Control-Allow-Origin')
        if cors_header == "http://localhost:5173":
            print("✅ CORS Header CORRECT.")
        else:
            print(f"❌ CORS Header INCORRECT or MISSING: {cors_header}")

    except Exception as e:
        print(f"❌ Error during verification: {e}")

if __name__ == "__main__":
    verify_login_api()
