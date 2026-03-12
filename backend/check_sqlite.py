import sqlite3
conn = sqlite3.connect("dairy.db")
cur = conn.cursor()
cur.execute("SELECT email, hashed_password FROM users")
for row in cur.fetchall():
    if "H0L44w5HQZ" in row[1]:
        print(f"FOUND IN SQLITE: {row}")
conn.close()
