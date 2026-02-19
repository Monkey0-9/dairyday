import sqlite3
import os

dbs = ['dairy.db', 'backend/dairy.db']
for db_path in dbs:
    full_path = os.path.abspath(db_path)
    print(f"\n--- Checking {full_path} ---")
    if not os.path.exists(full_path):
        print("  FILE NOT FOUND")
        continue
        
    try:
        conn = sqlite3.connect(full_path)
        cur = conn.cursor()
        cur.execute("SELECT name, email, role, is_active FROM users")
        rows = cur.fetchall()
        if not rows:
            print("  NO USERS FOUND")
        else:
            for row in rows:
                print(f"  Name: {row[0]}, Email: {row[1]}, Role: {row[2]}, Active: {row[3]}")
        conn.close()
    except Exception as e:
        print(f"  ERROR: {e}")
