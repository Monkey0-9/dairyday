#!/usr/bin/env python
"""Quick test of backend login"""
import sys
sys.path.insert(0, r'c:\dairy\backend')

import requests

print("Testing admin login on port 8002...")
try:
    r = requests.post(
        'http://localhost:8002/api/v1/auth/login',
        data={'username': 'admin@dairy.com', 'password': 'admin123'},
        timeout=10
    )
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text[:500]}")
except Exception as e:
    print(f"Error: {e}")

