import requests
import json

base_url = 'http://localhost:8000/api/v1'
login_data = {'username': 'admin@dairy.com', 'password': 'admin123'}

try:
    r = requests.post(f'{base_url}/auth/login', data=login_data)
    token = r.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    params = {'selected_date': '2026-02-12'}
    r = requests.get(f'{base_url}/admin/daily-entry', headers=headers, params=params)
    
    data = r.json()
    print(f"Total Users: {len(data)}")
    for item in data:
        if item['liters'] == 0.25:
            print(f"Found user with default 0.25L: {item['name']}")
            break
    else:
        print("No users with 0.25L default found in the list.")

except Exception as e:
    print(f"Error: {e}")
