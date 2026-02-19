
import sqlite3
from datetime import datetime

def fetch_latest_otp():
    try:
        conn = sqlite3.connect('dairy.db')
        cur = conn.cursor()
        cur.execute('SELECT email, otp_code, created_at, status FROM registration_requests ORDER BY created_at DESC LIMIT 20')
        rows = cur.fetchall()
        with open('otp_results.txt', 'w') as f:
            f.write("Last 20 Registration Requests:\n")
            f.write("-" * 60 + "\n")
            for row in rows:
                f.write(f"Email: {row[0]} | OTP: {row[1]} | Created At: {row[2]} | Status: {row[3]}\n")
        print("Results written to otp_results.txt")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fetch_latest_otp()
