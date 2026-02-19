import sqlite3
import os

db_paths = [
    os.path.join("c:\\", "dairy", "dairy.db"),
    os.path.join("c:\\", "dairy", "backend", "dairy.db")
]

for db_path in db_paths:
    if os.path.exists(db_path):
        print(f"Checking {db_path}...")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        try:
            # Check if table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='alembic_version'")
            if cursor.fetchone():
                cursor.execute('UPDATE alembic_version SET version_num = "6b119a39259c"')
                conn.commit()
                print(f"  ✅ Version stamped to 6b119a39259c")
            else:
                print(f"  ⚠️ Table 'alembic_version' not found in this DB.")
        except Exception as e:
            print(f"  ❌ Error: {e}")
        finally:
            conn.close()
    else:
        print(f"🚫 {db_path} does not exist.")
