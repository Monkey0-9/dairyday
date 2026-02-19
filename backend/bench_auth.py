import asyncio
import sqlite3
from app.core.security import verify_password

def check_auth():
    conn = sqlite3.connect('dairy.db')
    cursor = conn.cursor()
    cursor.execute('SELECT hashed_password, role, is_active FROM users WHERE email="admin@dairy.com"')
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        print("User admin@dairy.com not found in DB.")
        return
        
    hp, role, is_active = row
    print(f"User: admin@dairy.com")
    print(f"Role: {role}")
    print(f"Is Active: {is_active}")
    print(f"Hash in DB: {hp}")
    
    test_pass = "admin123"
    match = verify_password(test_pass, hp)
    print(f"Password '{test_pass}' match: {match}")

if __name__ == "__main__":
    check_auth()
