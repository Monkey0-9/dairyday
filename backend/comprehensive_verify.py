
import asyncio
import httpx
import json
from datetime import date

API_URL = "http://localhost:8000/api/v1"

async def verify_comprehensive():
    async with httpx.AsyncClient(timeout=10.0) as client:
        print("=== [1] ADMIN VERIFICATION ===")
        # Admin Login
        login_res = await client.post(f"{API_URL}/auth/login", data={
            "username": "admin@dairy.com",
            "password": "admin123"
        }, headers={"Content-Type": "application/x-www-form-urlencoded"})
        
        if login_res.status_code != 200:
            print(f"Admin Login Failed: {login_res.text}")
            return
            
        admin_token = login_res.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("Admin login successful.")

        # Check All Users (Admin Feature)
        users_res = await client.get(f"{API_URL}/users/", headers=admin_headers)
        if users_res.status_code == 200:
            print(f"Admin successfully fetched {len(users_res.json())} users.")
        else:
            print(f"Admin failed to fetch users: {users_res.text}")

        # Check Consumption Grid (Admin Feature)
        month = date.today().strftime("%Y-%m")
        grid_res = await client.get(f"{API_URL}/consumption/grid?month={month}", headers=admin_headers)
        grid_data = []
        if grid_res.status_code == 200:
            grid_data = grid_res.json()
            print(f"Admin successfully fetched consumption grid for {month} ({len(grid_data)} rows).")
        else:
            print(f"Admin failed to fetch consumption grid: {grid_res.text}")

        print("\n=== [2] USER VERIFICATION ===")
        # User Login
        user1_login = await client.post(f"{API_URL}/auth/login", data={
            "username": "user1@dairy.com",
            "password": "password123"
        }, headers={"Content-Type": "application/x-www-form-urlencoded"})
        
        if user1_login.status_code != 200:
            print(f"User Login Failed: {user1_login.text}")
            return
            
        user_token = user1_login.json()["access_token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}
        print("User login successful (user1@dairy.com).")

        # Check Self Profile
        me_res = await client.get(f"{API_URL}/users/me", headers=user_headers)
        user_id = None
        if me_res.status_code == 200:
            id_data = me_res.json()
            user_id = id_data["id"]
            print(f"User retrieved profile: {id_data['name']} (ID: {user_id})")
        else:
            print(f"User failed to fetch profile: {me_res.text}")

        # Check Own Consumption
        my_cons_res = await client.get(f"{API_URL}/consumption/mine?month={month}", headers=user_headers)
        user_cons_sum = 0
        if my_cons_res.status_code == 200:
            cons_list = my_cons_res.json()
            user_cons_sum = sum(float(c['quantity']) for c in cons_list)
            print(f"User retrieved personal consumption: {len(cons_list)} days found, Total: {user_cons_sum:.1f} L")
        else:
            print(f"User failed to fetch personal consumption: {my_cons_res.text}")

        print("\n=== [3] DATA CONSISTENCY CHECK ===")
        # Compare Admin Grid row for user1 with user1's self-view
        if grid_data and user_id:
            user1_row = next((r for r in grid_data if r['user_id'] == str(user_id)), None)
            if user1_row:
                grid_sum = sum(user1_row['daily_liters'].values())
                print(f"Admin Grid Sum for user1: {grid_sum:.1f} L")
                print(f"User Self View Sum: {user_cons_sum:.1f} L")
                if abs(grid_sum - user_cons_sum) < 0.01:
                    print("SUCCESS: Data is consistent across admin and user views!")
                else:
                    print("WARNING: Data mismatch detected between admin and user views.")
            else:
                print("Could not find user1 in the admin grid data.")

if __name__ == "__main__":
    asyncio.run(verify_comprehensive())
