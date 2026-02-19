
import sqlite3

def check_users():
    conn = sqlite3.connect('dairy.db')
    cur = conn.cursor()
    cur.execute("SELECT id, name, email, role, is_active FROM users")
    rows = cur.fetchall()
    print("All Users:")
    print("-" * 50)
    for row in rows:
        print(f"ID: {row[0]} | Name: {row[1]} | Email: {row[2]} | Role: {row[3]} | Is Active: {row[4]}")
    conn.close()

if __name__ == "__main__":
    check_users()
