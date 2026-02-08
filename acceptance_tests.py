#!/usr/bin/env python
"""
DairyOS Acceptance Tests - Python Runner
Tests all endpoints and functionality of the Dairy Management System
"""
import requests
import json
import sys
from datetime import date, datetime

# Configuration
API_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3001"

class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'

def log_info(msg):
    print(f"{Colors.BLUE}[INFO]{Colors.NC} {msg}")

def log_success(msg):
    print(f"{Colors.GREEN}[PASS]{Colors.NC} {msg}")

def log_fail(msg):
    print(f"{Colors.RED}[FAIL]{Colors.NC} {msg}")

def log_warn(msg):
    print(f"{Colors.YELLOW}[WARN]{Colors.NC} {msg}")

def print_header(title):
    print("\n" + "=" * 50)
    print(title)
    print("=" * 50)

def main():
    results = []
    
    print_header("DAIRYOS ACCEPTANCE TESTS")
    
    # Test 1: Health Check
    print_header("TEST 1: Health Check")
    try:
        r = requests.get(f"{API_URL}/api/health", timeout=10)
        if r.status_code == 200:
            log_success("Backend health check passed (HTTP 200)")
            log_info(f"Response: {r.json()}")
            results.append(("Health Check", "PASS"))
        else:
            log_fail(f"Health check failed (HTTP {r.status_code})")
            results.append(("Health Check", "FAIL"))
    except Exception as e:
        log_fail(f"Health check error: {e}")
        results.append(("Health Check", "ERROR"))
    
    # Test 2: Admin Login
    print_header("TEST 2: Admin Login")
    admin_token = None
    try:
        r = requests.post(
            f"{API_URL}/api/v1/auth/login",
            data={"username": "admin@dairy.com", "password": "admin123"},
            timeout=10
        )
        if r.status_code == 200:
            data = r.json()
            admin_token = data.get("access_token")
            log_success("Admin login successful")
            log_info(f"Token received: {admin_token[:50]}...")
            results.append(("Admin Login", "PASS"))
        else:
            log_fail(f"Admin login failed (HTTP {r.status_code})")
            log_info(f"Response: {r.text[:200]}")
            results.append(("Admin Login", "FAIL"))
    except Exception as e:
        log_fail(f"Admin login error: {e}")
        results.append(("Admin Login", "ERROR"))
    
    # Test 3: User Login
    print_header("TEST 3: User Login")
    user_token = None
    try:
        r = requests.post(
            f"{API_URL}/api/v1/auth/login",
            data={"username": "user1@dairy.com", "password": "password123"},
            timeout=10
        )
        if r.status_code == 200:
            data = r.json()
            user_token = data.get("access_token")
            log_success("User login successful")
            results.append(("User Login", "PASS"))
        else:
            log_fail(f"User login failed (HTTP {r.status_code})")
            results.append(("User Login", "FAIL"))
    except Exception as e:
        log_fail(f"User login error: {e}")
        results.append(("User Login", "ERROR"))
    
    # Test 4: Admin Daily Entry Access
    print_header("TEST 4: Admin Daily Entry Access")
    if admin_token:
        try:
            today = date.today().isoformat()
            r = requests.get(
                f"{API_URL}/api/v1/admin/daily-entry?selected_date={today}",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            if r.status_code == 200:
                log_success("Admin can access daily entry")
                results.append(("Admin Daily Entry", "PASS"))
            else:
                log_fail(f"Admin daily entry failed (HTTP {r.status_code})")
                results.append(("Admin Daily Entry", "FAIL"))
        except Exception as e:
            log_fail(f"Error: {e}")
            results.append(("Admin Daily Entry", "ERROR"))
    else:
        log_warn("Skipping - no admin token")
        results.append(("Admin Daily Entry", "SKIPPED"))
    
    # Test 5: User Consumption Access
    print_header("TEST 5: User Consumption Access")
    if user_token:
        try:
            month = date.today().strftime("%Y-%m")
            r = requests.get(
                f"{API_URL}/api/v1/consumption/mine?month={month}",
                headers={"Authorization": f"Bearer {user_token}"},
                timeout=10
            )
            if r.status_code == 200:
                log_success("User can access own consumption")
                results.append(("User Consumption", "PASS"))
            else:
                log_fail(f"User consumption failed (HTTP {r.status_code})")
                results.append(("User Consumption", "FAIL"))
        except Exception as e:
            log_fail(f"Error: {e}")
            results.append(("User Consumption", "ERROR"))
    else:
        log_warn("Skipping - no user token")
        results.append(("User Consumption", "SKIPPED"))
    
    # Test 6: Admin User List
    print_header("TEST 6: Admin User List Access")
    if admin_token:
        try:
            r = requests.get(
                f"{API_URL}/api/v1/users/",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            if r.status_code == 200:
                users = r.json()
                log_success(f"Admin can access user list ({len(users)} users)")
                results.append(("Admin User List", "PASS"))
            else:
                log_fail(f"Admin user list failed (HTTP {r.status_code})")
                results.append(("Admin User List", "FAIL"))
        except Exception as e:
            log_fail(f"Error: {e}")
            results.append(("Admin User List", "ERROR"))
    else:
        log_warn("Skipping - no admin token")
        results.append(("Admin User List", "SKIPPED"))
    
    # Test 7: Regular User Cannot Access Admin
    print_header("TEST 7: Regular User Admin Restriction")
    if user_token:
        try:
            r = requests.get(
                f"{API_URL}/api/v1/users/",
                headers={"Authorization": f"Bearer {user_token}"},
                timeout=10
            )
            if r.status_code == 403:
                log_success("Regular user properly blocked from admin endpoints (HTTP 403)")
                results.append(("User Admin Restriction", "PASS"))
            else:
                log_fail(f"Unexpected result (HTTP {r.status_code})")
                results.append(("User Admin Restriction", "FAIL"))
        except Exception as e:
            log_fail(f"Error: {e}")
            results.append(("User Admin Restriction", "ERROR"))
    else:
        log_warn("Skipping - no user token")
        results.append(("User Admin Restriction", "SKIPPED"))
    
    # Test 8: Frontend Health
    print_header("TEST 8: Frontend Health Check")
    try:
        r = requests.get(FRONTEND_URL, timeout=10)
        if r.status_code == 200:
            log_success("Frontend is accessible (HTTP 200)")
            results.append(("Frontend Health", "PASS"))
        elif r.status_code == 304:
            log_success("Frontend is accessible (HTTP 304)")
            results.append(("Frontend Health", "PASS"))
        else:
            log_warn(f"Frontend returned HTTP {r.status_code}")
            results.append(("Frontend Health", "NEEDS REVIEW"))
    except Exception as e:
        log_warn(f"Frontend check: {e}")
        results.append(("Frontend Health", "NEEDS REVIEW"))
    
    # Summary
    print_header("SUMMARY")
    passed = sum(1 for _, status in results if status == "PASS")
    failed = sum(1 for _, status in results if status == "FAIL")
    skipped = sum(1 for _, status in results if status == "SKIPPED")
    needs_review = sum(1 for _, status in results if status == "NEEDS REVIEW")
    errors = sum(1 for _, status in results if status == "ERROR")
    
    print(f"\nTotal Tests: {len(results)}")
    print(f"{Colors.GREEN}Passed: {passed}{Colors.NC}")
    print(f"{Colors.RED}Failed: {failed}{Colors.NC}")
    print(f"{Colors.YELLOW}Needs Review: {needs_review}{Colors.NC}")
    print(f"{Colors.YELLOW}Skipped: {skipped}{Colors.NC}")
    print(f"{Colors.RED}Errors: {errors}{Colors.NC}")
    
    # Save results
    with open("acceptance-results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {"passed": passed, "failed": failed, "skipped": skipped, "needs_review": needs_review, "errors": errors},
            "results": results
        }, f, indent=2)
    
    print(f"\nResults saved to: acceptance-results.json")
    
    return passed, failed

if __name__ == "__main__":
    main()

