import requests
import json
import sys
import os

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000/api/v1")

def verify_profile_update():
    print("Starting Profile Update Verification...")
    
    # 1. Login
    login_url = f"{BASE_URL}/auth/login"
    payload = {
        "username": os.environ.get("ADMIN_EMAIL", "admin@dairy.com"),
        "password": os.environ.get("ADMIN_PASSWORD", "admin123")
    }
    
    try:
        # Using form data for OAuth2
        response = requests.post(login_url, data=payload) 
        
        if response.status_code != 200:
            print(f"❌ Login failed: {response.text}")
            return

        data = response.json()
        token = data.get("access_token")
        if not token:
            print("❌ No access token returned")
            return
            
        auth_headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login Successful")
        
        # 2. Get Profile
        me_url = f"{BASE_URL}/users/me"
        r = requests.get(me_url, headers=auth_headers)
        if r.status_code != 200:
            print(f"❌ Get Profile failed: {r.text}")
            return
        
        original_data = r.json()
        print(f"Original Name: {original_data.get('name')}")
        print(f"Original Theme: {original_data.get('theme')}")
        
        # 3. Update Profile
        update_payload = {
            "name": "Admin Updated",
            "theme": "light"
        }
        print("Updating profile...")
        r = requests.patch(me_url, json=update_payload, headers=auth_headers)
        if r.status_code != 200:
            print(f"❌ Update Profile failed: {r.text}")
            return
        
        updated_data = r.json()
        print(f"Updated Name: {updated_data.get('name')}")
        print(f"Updated Theme: {updated_data.get('theme')}")
        
        if updated_data['name'] == "Admin Updated" and updated_data['theme'] == "light":
            print("✅ Profile Update Verified!")
        else:
            print("❌ Profile Update Mismatch!")

        # 4. Revert
        print("Reverting changes...")
        revert_payload = {
            "name": original_data.get('name'),
            "theme": original_data.get('theme')
        }
        requests.patch(me_url, json=revert_payload, headers=auth_headers)
        print("✅ Reverted changes.")

    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    verify_profile_update()
