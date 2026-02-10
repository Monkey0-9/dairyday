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
    print("Columns in users:")
    found = False
    for col in columns:
        print(col)
        if col[1] == 'hashed_password':
            found = True
    
    if found:
        print("\nHashed password column FOUND.")
    else:
        print("\nHashed password column NOT FOUND.")

    # Check alembic version
    try:
        cursor.execute("SELECT * FROM alembic_version")
        ver = cursor.fetchall()
        print(f"\nAlembic version: {ver}")
    except sqlite3.OperationalError:
        print("\nAlembic version table NOT FOUND.")

except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
