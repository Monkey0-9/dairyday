
import requests
import sys

sys.path.insert(0, ".")

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_token(token, name):
    print(f"\nScanning: {name}")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.get(f"{BASE_URL}/users/me", headers=headers, timeout=5)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code == 401:
            print("PASS: 401 Unauthorized")
        elif resp.status_code == 500:
            print("FAIL: 500 Internal Server Error (The Bug is Present)")
        else:
            print(f"FAIL: Unexpected Status {resp.status_code}")
            print(f"Body: {resp.text}")
    except Exception as e:
        print(f"ERROR: {e}")

def main():
    print("--- 500 ERROR REGRESSION TEST ---")
    
    # 1. Malformed Token
    test_token("malformed.token.structure", "Malformed Token")
    
    # 2. Random Garbage
    test_token("garbage_string_12345", "Garbage String")
    
    # 3. Valid Header, Invalid Signature
    # eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid_signature
    jwt_mock = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    test_token(jwt_mock, "Forged JWT")

if __name__ == "__main__":
    main()
