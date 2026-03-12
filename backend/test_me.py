import requests
import sys

base_url = "http://127.0.0.1:8000/api/v1"

def test_full_login(email, password):
    print(f"\n--- Testing full flow for {email} ---")
    resp = requests.post(f"{base_url}/auth/login", json={"username": email, "password": password})
    if resp.status_code != 200:
        print(f"❌ Login Failed: {resp.text}")
        return False
        
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    me_resp = requests.get(f"{base_url}/users/me", headers=headers)
    if me_resp.status_code != 200:
        print(f"❌ /users/me Failed: {me_resp.text}")
        return False
    else:
        print(f"✅ /users/me Success: {me_resp.json().get('name')}")
        
    return True

if __name__ == "__main__":
    test_full_login("admin@dairy.com", "admin123")
    test_full_login("prakashpraveen239@gmail.com", "admin123")
