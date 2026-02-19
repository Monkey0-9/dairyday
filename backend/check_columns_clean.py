
import sqlite3
import os

db_path = 'c:/dairy/backend/dairy.db'

def check_columns(table_name):
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        return
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    print(f"Columns in {table_name}:")
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
    conn.close()

if __name__ == "__main__":
    check_columns('registration_requests')
