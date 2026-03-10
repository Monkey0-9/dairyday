"""Reset admin password to admin123."""
import sqlite3
import sys
sys.path.insert(0, 'C:/dairy/backend')

from passlib.context import CryptContext

ctx = CryptContext(schemes=["bcrypt"])
new_hash = ctx.hash("admin123")

conn = sqlite3.connect("C:/dairy/backend/dairy.db")
cur = conn.cursor()

cur.execute("SELECT id, email, role, is_active FROM users LIMIT 15")
rows = cur.fetchall()
print("=== All Users ===")
for r in rows:
    print(r)

cur.execute(
    "UPDATE users SET hashed_password=?, is_active=1 WHERE email='admin@dairy.com'",
    (new_hash,)
)
print(f"\nRows updated for admin@dairy.com: {cur.rowcount}")

conn.commit()
conn.close()
print("Done — password set to: admin123")
