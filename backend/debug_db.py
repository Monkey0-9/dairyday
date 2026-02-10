import sqlite3
import os

db_path = "dairy.db"
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
try:
    cursor.execute("PRAGMA table_info(users)")
    columns = cursor.fetchall()
    with open("db_schema_utf8.txt", "w", encoding="utf-8") as f:
        f.write("Columns in users:\n")
        for col in columns:
            f.write(str(col) + "\n")
    print("Columns written to db_schema_utf8.txt")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
