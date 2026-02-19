import requests
import json
import os

# Configuration
BASE_URL = "http://localhost:8001/api/v1"
ADMIN_USER = "admin@dairy.com"
ADMIN_PASS = "admin123"

def test_pdf_export():
    print("--- Testing PDF Export ---")
    
    # 1. Login to get token
    print("Logging in...")
    login_res = requests.post(f"{BASE_URL}/auth/login", data={
        "username": ADMIN_USER,
        "password": ADMIN_PASS
    })
    if login_res.status_code != 200:
        print(f"Login failed: {login_res.text}")
        return
    
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Call export endpoint
    month = "2026-02"
    print(f"Exporting PDF for {month}...")
    export_res = requests.get(
        f"{BASE_URL}/consumption/export?month={month}&format=pdf",
        headers=headers,
        stream=True
    )
    
    if export_res.status_code != 200:
        print(f"Export failed: {export_res.status_code} - {export_res.text}")
        return
    
    content_type = export_res.headers.get("Content-Type")
    print(f"Content-Type: {content_type}")
    
    if "application/pdf" not in content_type:
        print("Error: Response is not a PDF")
        return
    
    # 3. Check for PDF magic bytes
    chunk = next(export_res.iter_content(chunk_size=4))
    if chunk == b'%PDF':
        print("Success: Verified PDF magic bytes (%PDF)!")
    else:
        print(f"Error: Invalid PDF magic bytes: {chunk}")

if __name__ == "__main__":
    test_pdf_export()
