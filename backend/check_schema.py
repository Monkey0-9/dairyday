import sqlite3
import os

db_path = 'c:/dairy/backend/dairy.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- bills columns ---")
    cursor.execute("PRAGMA table_info(bills)")
    for col in cursor.fetchall():
        print(col)
        
    print("\n--- webhook_events columns ---")
    cursor.execute("PRAGMA table_info(webhook_events)")
    for col in cursor.fetchall():
        print(col)
        
    print("\n--- idempotency_keys columns ---")
    cursor.execute("PRAGMA table_info(idempotency_keys)")
    for col in cursor.fetchall():
        print(col)
        
    conn.close()
else:
    print(f"Database not found at {db_path}")
