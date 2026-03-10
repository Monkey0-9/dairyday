"""Seed the test customer user prakashpraveen239@gmail.com / test12345"""
import sqlite3
import sys
import uuid
sys.path.insert(0, 'C:/dairy/backend')

from passlib.context import CryptContext

ctx = CryptContext(schemes=["bcrypt"])
new_hash = ctx.hash("test12345")

conn = sqlite3.connect("C:/dairy/backend/dairy.db")
cur = conn.cursor()

email = "prakashpraveen239@gmail.com"
cur.execute("SELECT id, email, role, is_active, hashed_password FROM users WHERE email=?", (email,))
existing = cur.fetchone()

print(f"=== Looking for {email} ===")
if existing:
    print(f"Found: {existing}")
    # Update password just in case
    cur.execute("UPDATE users SET hashed_password=?, is_active=1, role='USER' WHERE email=?", (new_hash, email))
    print(f"Updated password to test12345. Rows: {cur.rowcount}")
else:
    print("Not found — creating user...")
    uid = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO users 
        (id, name, email, phone, hashed_password, role, is_active, price_per_liter, daily_target_qty)
        VALUES (?, 'Praveen P', ?, '9980592787', ?, 'USER', 1, 48.0, 1.0)
    """, (uid, email, new_hash))
    print(f"Created user with id={uid}")

conn.commit()

# Verify
cur.execute("SELECT id, email, role, is_active FROM users WHERE email=?", (email,))
row = cur.fetchone()
print(f"\nFinal state: {row}")
conn.close()
print("Done! Login: prakashpraveen239@gmail.com / test12345")
