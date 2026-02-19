
import sqlite3
import os

def check_hashes():
    db_path = 'dairy.db'
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found.")
        return
        
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT email, hashed_password FROM users")
    rows = cur.fetchall()
    
    print(f"{'Email':<30} | {'Hash'}")
    print("-" * 100)
    for email, hashed_pwd in rows:
        print(f"{email:<30} | {hashed_pwd}")
    conn.close()

if __name__ == "__main__":
    check_hashes()
