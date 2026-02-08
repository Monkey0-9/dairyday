
import httpx
import asyncio
import sys

async def test_auth_flow():
    base_url = "http://localhost:8000/api/v1"
    timeout = httpx.Timeout(10.0, connect=5.0)
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            # 0. Initial probe (get CSRF token)
            print("Probing server for CSRF token...")
            probe = await client.get("http://localhost:8000/")
            csrf_token = probe.cookies.get("csrf_token")
            print(f"Initial CSRF Token: {csrf_token}")

            # 1. Test Login
            print("\nTesting Login...")
            login_data = {"username": "admin@dairy.com", "password": "admin123"}
            headers = {"X-CSRF-Token": csrf_token} if csrf_token else {}
            
            response = await client.post(f"{base_url}/auth/login", data=login_data, headers=headers)
            
            if response.status_code != 200:
                print(f"Login failed: {response.status_code}")
                print(response.text)
                return

            cookies = response.cookies
            csrf_token = cookies.get("csrf_token") or csrf_token
            print(f"Cookies set: {list(cookies.keys())}")
            
            access_token_cookie = cookies.get("access_token")
            refresh_token_cookie = cookies.get("refresh_token")
            user_role_cookie = cookies.get("user_role")
            
            print(f"Access Token Cookie: {'Present' if access_token_cookie else 'Missing'}")
            print(f"Refresh Token Cookie: {'Present' if refresh_token_cookie else 'Missing'}")
            print(f"User Role Cookie: {user_role_cookie}")

            # 2. Test Accessing Protected Route (/me)
            print("\nTesting /me with cookies...")
            me_response = await client.get(f"{base_url}/users/me", cookies=cookies)
            print(f"/me status: {me_response.status_code}")
            if me_response.status_code == 200:
                print(f"User profile: {me_response.json()['email']}")

            # 3. Test Refresh
            print("\nTesting Token Refresh...")
            headers = {"X-CSRF-Token": csrf_token} if csrf_token else {}
            refresh_response = await client.post(f"{base_url}/auth/refresh", cookies=cookies, headers=headers)
            print(f"Refresh status: {refresh_response.status_code}")
            if refresh_response.status_code == 200:
                new_cookies = refresh_response.cookies
                csrf_token = new_cookies.get("csrf_token") or csrf_token
                print(f"New cookies set: {list(new_cookies.keys())}")

            # 4. Test Logout
            print("\nTesting Logout...")
            headers = {"X-CSRF-Token": csrf_token} if csrf_token else {}
            logout_response = await client.post(f"{base_url}/auth/logout", cookies=cookies, headers=headers)
            print(f"Logout status: {logout_response.status_code}")
            
            # 5. Test Access After Logout (Revocation)
            print("\nTesting Access After Logout...")
            # We use the old cookies (tokens should be blacklisted)
            me_after_logout = await client.get(f"{base_url}/users/me", cookies=cookies)
            print(f"/me after logout status (should be 401 or 403): {me_after_logout.status_code}")
            if me_after_logout.status_code in (401, 403):
                print("SUCCESS: Access denied after logout.")
            else:
                print("FAILURE: Still able to access after logout.")

        except httpx.ConnectError:
            print("ERROR: Could not connect to server. Is it running on port 8000?")
        except Exception as e:
            print(f"ERROR: An unexpected error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(test_auth_flow())
